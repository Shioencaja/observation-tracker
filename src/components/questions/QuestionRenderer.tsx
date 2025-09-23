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

  switch (question.question_type) {
    case "text":
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
        `Unknown question type: ${question.question_type}, falling back to text input`
      );
      return (
        <TextQuestion
          {...commonProps}
          value={value || ""}
          onChange={onChange}
        />
      );
  }
}
