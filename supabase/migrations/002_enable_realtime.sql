-- ════════════════════════════════════════════════════════════
-- Migration 002: Enable Supabase Realtime for Messages & Notifications
-- Run this in the Supabase SQL Editor if realtime events are not firing
-- ════════════════════════════════════════════════════════════

-- Add tables to the supabase_realtime publication
DO $$
BEGIN
  -- Enable realtime on messages table if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  -- Enable realtime on notifications table if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- Enable realtime on tasks table for live board updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
