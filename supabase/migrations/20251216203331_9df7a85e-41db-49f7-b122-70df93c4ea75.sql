-- Add title column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS title text;

-- Backfill existing conversation titles from first user message
UPDATE conversations c
SET title = (
  SELECT SUBSTRING(m.content, 1, 50)
  FROM messages m
  WHERE m.conversation_id = c.id AND m.role = 'user'
  ORDER BY m.created_at ASC
  LIMIT 1
)
WHERE c.title IS NULL;