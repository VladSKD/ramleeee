-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  city TEXT,
  bio TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  high_contrast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- ===== INTERESTS =====
CREATE TABLE public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interests_read_all" ON public.interests
  FOR SELECT TO authenticated, anon USING (true);

-- ===== USER_INTERESTS =====
CREATE TABLE public.user_interests (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, interest_id)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ui_select_authenticated" ON public.user_interests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ui_insert_self" ON public.user_interests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ui_delete_self" ON public.user_interests
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== MATCHES =====
CREATE TYPE public.match_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.match_status NOT NULL DEFAULT 'pending',
  initiator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user1_id < user2_id)
);
CREATE UNIQUE INDEX matches_pair_idx ON public.matches (user1_id, user2_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_participant" ON public.matches
  FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "matches_insert_participant" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = initiator_id AND (auth.uid() = user1_id OR auth.uid() = user2_id)
  );
CREATE POLICY "matches_update_participant" ON public.matches
  FOR UPDATE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ===== MESSAGES =====
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON public.messages (match_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
      AND m.status = 'accepted')
  );
CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
      AND m.status = 'accepted')
  );

-- ===== CONSENTS =====
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  necessary BOOLEAN NOT NULL DEFAULT true,
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  tos_accepted BOOLEAN NOT NULL DEFAULT false,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_select_self" ON public.consents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "consents_insert_any" ON public.consents
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- ===== Trigger: auto profile + initial consent on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.consents (user_id, necessary, analytics, marketing, tos_accepted)
  VALUES (NEW.id, true,
    COALESCE((NEW.raw_user_meta_data->>'analytics')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'marketing')::boolean, false),
    true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER matches_touch BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- ===== Seed interests =====
INSERT INTO public.interests (name, category) VALUES
('Кава', 'Спосіб життя'),('Біг', 'Спорт'),('Йога', 'Спорт'),
('Велосипед', 'Спорт'),('Похід в гори', 'Подорожі'),('Кіно', 'Культура'),
('Книги', 'Культура'),('Настільні ігри', 'Дозвілля'),('Кулінарія', 'Дозвілля'),
('Фотографія', 'Творчість'),('Музика', 'Культура'),('Концерти', 'Культура'),
('Мистецтво', 'Культура'),('Підкасти', 'Культура'),('Технології', 'Робота'),
('Стартапи', 'Робота'),('Мови', 'Освіта'),('Волонтерство', 'Спільнота'),
('Тварини', 'Спосіб життя'),('Бордові ігри', 'Дозвілля');