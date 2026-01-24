-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create enum for stream status
CREATE TYPE public.stream_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');

-- Create enum for recording status
CREATE TYPE public.recording_status AS ENUM ('pending', 'saved', 'discarded');

-- Create enum for prayer session status
CREATE TYPE public.prayer_session_status AS ENUM ('scheduled', 'active', 'ended');

-- Create enum for media type
CREATE TYPE public.media_type AS ENUM ('video', 'audio', 'pdf', 'text');

-- Create enum for download request status
CREATE TYPE public.download_request_status AS ENUM ('pending', 'approved', 'denied');

-- Create enum for feedback type
CREATE TYPE public.feedback_type AS ENUM ('inquiry', 'feedback', 'complaint');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create live_streams table
CREATE TABLE public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status stream_status NOT NULL DEFAULT 'scheduled',
  stream_key TEXT UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  recording_url TEXT,
  recording_status recording_status DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prayer_sessions table
CREATE TABLE public.prayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status prayer_session_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER DEFAULT 100,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prayer_participants table
CREATE TABLE public.prayer_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.prayer_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  can_speak BOOLEAN DEFAULT false,
  can_video BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (session_id, user_id)
);

-- Create media_content table
CREATE TABLE public.media_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_type media_type NOT NULL,
  category TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  is_published BOOLEAN DEFAULT false,
  is_downloadable BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create download_requests table
CREATE TABLE public.download_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_id UUID REFERENCES public.media_content(id) ON DELETE CASCADE NOT NULL,
  status download_request_status NOT NULL DEFAULT 'pending',
  request_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  transaction_id TEXT,
  donor_name TEXT,
  donor_email TEXT,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type feedback_type NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  message TEXT NOT NULL,
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'location'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prayer_sessions_updated_at
  BEFORE UPDATE ON public.prayer_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_content_updated_at
  BEFORE UPDATE ON public.media_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- User Roles RLS Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Live Streams RLS Policies
CREATE POLICY "Anyone can view live streams"
  ON public.live_streams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage live streams"
  ON public.live_streams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Prayer Sessions RLS Policies
CREATE POLICY "Authenticated users can view prayer sessions"
  ON public.prayer_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and moderators can manage prayer sessions"
  ON public.prayer_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Prayer Participants RLS Policies
CREATE POLICY "Users can view participants in their sessions"
  ON public.prayer_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join sessions"
  ON public.prayer_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON public.prayer_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can manage participants"
  ON public.prayer_participants FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Media Content RLS Policies
CREATE POLICY "Anyone can view published media"
  ON public.media_content FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage all media"
  ON public.media_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Download Requests RLS Policies
CREATE POLICY "Users can view their own requests"
  ON public.download_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create download requests"
  ON public.download_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage download requests"
  ON public.download_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Donations RLS Policies
CREATE POLICY "Users can view their own donations"
  ON public.donations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create donations"
  ON public.donations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all donations"
  ON public.donations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Feedback RLS Policies
CREATE POLICY "Users can submit feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all feedback"
  ON public.feedback FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for prayer sessions and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;