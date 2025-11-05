-- add-next-question-map-column.sql
-- Add next_question_map column to project_observation_options table
-- This column stores a JSON object mapping answer option values to next question IDs

ALTER TABLE public.project_observation_options
ADD COLUMN IF NOT EXISTS next_question_map JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN public.project_observation_options.next_question_map IS 
'JSON object mapping answer option values to next question IDs. Format: {"option_value_1": "question_id_1", "option_value_2": "question_id_2"}. If null or empty, questions follow default order.';

