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

  console.log("🔍 Rendering question:", {
    questionId: question.id,
    questionName: question.name,
    questionType: question.question_type,
    normalizedQuestionType,
    value: value
  });

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
      // Set first option as default if no value is selected
      const defaultValue =
        value ||
        (question.options && question.options.length > 0
          ? question.options[0]
          : "");

      // If no value is set and we have options, automatically select the first one
      if (!value && question.options && question.options.length > 0) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => onChange(question.options[0]), 0);
      }

      return (
        <MultipleChoiceQuestion
          {...commonProps}
          value={defaultValue}
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
        <UrlQuestion {...commonProps} value={value || ""} onChange={onChange} />
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
      error: error
    });
    
    // Fallback to text input on error
    return (
      <TextQuestion
        {...commonProps}
        value={value || ""}
        onChange={onChange}
      />
    );
  }
}
