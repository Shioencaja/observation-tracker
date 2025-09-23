# Question Components

This directory contains dedicated React components for different question types in questionnaires. Each component is designed to handle a specific input type with proper validation and styling.

## Supported Question Types

### 1. TextQuestion
- **Type**: `text`
- **Component**: `TextQuestion`
- **Description**: Single-line text input
- **Props**: `id`, `name`, `value`, `onChange`, `placeholder`, `required`

### 2. TextareaQuestion
- **Type**: `textarea`
- **Component**: `TextareaQuestion`
- **Description**: Multi-line text input
- **Props**: `id`, `name`, `value`, `onChange`, `placeholder`, `rows`, `required`

### 3. BooleanQuestion
- **Type**: `boolean`
- **Component**: `BooleanQuestion`
- **Description**: Yes/No radio buttons
- **Props**: `id`, `name`, `value`, `onChange`, `required`
- **Values**: "Sí", "No"

### 4. MultipleChoiceQuestion
- **Type**: `multiple_choice`
- **Component**: `MultipleChoiceQuestion`
- **Description**: Radio buttons with multiple options
- **Props**: `id`, `name`, `value`, `onChange`, `options`, `required`

### 5. CheckboxQuestion
- **Type**: `checkbox`
- **Component**: `CheckboxQuestion`
- **Description**: Multiple checkboxes allowing multiple selections
- **Props**: `id`, `name`, `value`, `onChange`, `options`, `required`
- **Value**: Array of strings

### 6. SelectQuestion
- **Type**: `select`
- **Component**: `SelectQuestion`
- **Description**: Dropdown select with options
- **Props**: `id`, `name`, `value`, `onChange`, `options`, `placeholder`, `required`

### 7. NumberQuestion
- **Type**: `number`
- **Component**: `NumberQuestion`
- **Description**: Number input with optional min/max/step
- **Props**: `id`, `name`, `value`, `onChange`, `placeholder`, `min`, `max`, `step`, `required`

### 8. DateQuestion
- **Type**: `date`
- **Component**: `DateQuestion`
- **Description**: Date picker input
- **Props**: `id`, `name`, `value`, `onChange`, `required`

### 9. TimeQuestion
- **Type**: `time`
- **Component**: `TimeQuestion`
- **Description**: Time picker input
- **Props**: `id`, `name`, `value`, `onChange`, `required`

### 10. EmailQuestion
- **Type**: `email`
- **Component**: `EmailQuestion`
- **Description**: Email input with validation
- **Props**: `id`, `name`, `value`, `onChange`, `placeholder`, `required`

### 11. UrlQuestion
- **Type**: `url`
- **Component**: `UrlQuestion`
- **Description**: URL input with validation
- **Props**: `id`, `name`, `value`, `onChange`, `placeholder`, `required`

## Usage

### Individual Components
```tsx
import { TextQuestion, BooleanQuestion } from "@/components/questions";

<TextQuestion
  id="question-1"
  name="What is your name?"
  value={response}
  onChange={setResponse}
  required={true}
/>
```

### Using QuestionRenderer
```tsx
import QuestionRenderer from "@/components/questions/QuestionRenderer";

<QuestionRenderer
  question={{
    id: "question-1",
    name: "What is your name?",
    question_type: "text",
    options: []
  }}
  value={response}
  onChange={setResponse}
  required={true}
/>
```

## Database Schema

The question types correspond to the `question_type` field in the `project_observation_options` table:

```sql
CREATE TABLE project_observation_options (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options TEXT[],
  project_id UUID REFERENCES projects(id),
  is_visible BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Styling

All components use consistent styling with:
- Tailwind CSS classes
- Shadcn UI components
- Consistent spacing and typography
- Focus states and accessibility
- Required field indicators

## Validation

Each component handles its own validation:
- Required fields are marked with a red asterisk
- HTML5 validation attributes where applicable
- Proper error states and feedback
