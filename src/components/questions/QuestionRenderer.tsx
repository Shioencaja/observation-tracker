"use client";

import {
  TextQuestion,
  TextareaQuestion,
  BooleanQuestion,
  MultipleChoiceQuestion,
  CheckboxQuestion,
  SelectQuestion,
  NumberQuestion,
  DateQuestion,
  TimeQuestion,
  EmailQuestion,
  UrlQuestion,
  CounterQuestion,
} from "./index";
import VoiceQuestionWithStorage from "./VoiceQuestionWithStorage";
import TimerQuestionNew from "./TimerQuestionNew";

interface Question {
  id: string;
  name: string;
  question_type: string;
  options: string[];
}

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  required = false,
  disabled = false,
}: QuestionRendererProps) {
  const commonProps = {
    id: question.id,
    name: question.name,
    required,
    disabled,
  };

  // Normalize question type to handle any whitespace or encoding issues
  const normalizedQuestionType = question.question_type?.trim().toLowerCase();

  try {
    switch (normalizedQuestionType) {
      case "text":
      case "string": // Handle both 'text' and 'string' question types
        return (
          <TextQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "textarea":
        return (
          <TextareaQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "boolean":
        // Check if this boolean question actually has options (should be radio)
        if (question.options && question.options.length > 0) {
          console.warn(
            "⚠️ Boolean question with options detected, rendering as radio:",
            {
              questionId: question.id,
              questionName: question.name,
              options: question.options,
            }
          );
          return (
            <MultipleChoiceQuestion
              {...commonProps}
              value={value || ""}
              onChange={onChange}
              options={question.options}
            />
          );
        }
        return (
          <BooleanQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "multiple_choice":
      case "radio": // Handle both 'multiple_choice' and 'radio' question types
      case "opcion_unica": // Handle Spanish version
      case "opción única": // Handle Spanish version with accent
        // Don't pre-select any option for radio buttons
        return (
          <MultipleChoiceQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
            options={question.options}
          />
        );

      case "checkbox":
        return (
          <CheckboxQuestion
            {...commonProps}
            value={value || []}
            onChange={onChange}
            options={question.options}
          />
        );

      case "select":
        return (
          <SelectQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
            options={question.options}
          />
        );

      case "number":
        return (
          <NumberQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "date":
        return (
          <DateQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "time":
        return (
          <TimeQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "email":
        return (
          <EmailQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "url":
        return (
          <UrlQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "timer":
        return (
          <TimerQuestionNew
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "voice":
        return (
          <VoiceQuestionWithStorage
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );

      case "counter":
        return (
          <CounterQuestion
            {...commonProps}
            value={value || 0}
            onChange={onChange}
          />
        );

      default:
        // Fallback to text input for unknown question types
        console.warn(
          `Unknown question type: "${question.question_type}" (normalized: "${normalizedQuestionType}"), falling back to text input`
        );
        return (
          <TextQuestion
            {...commonProps}
            value={value || ""}
            onChange={onChange}
          />
        );
    }
  } catch (error) {
    console.error("❌ Error rendering question:", {
      questionId: question.id,
      questionName: question.name,
      questionType: question.question_type,
      error: error,
    });

    // Fallback to text input on error
    return (
      <TextQuestion {...commonProps} value={value || ""} onChange={onChange} />
    );
  }
}
