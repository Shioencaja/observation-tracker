"use client";

import { useState } from "react";
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
} from "./index";

export default function QuestionTypesExample() {
  const [responses, setResponses] = useState<Record<string, any>>({});

  const handleChange = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Question Types Examples
      </h1>

      <div className="space-y-6">
        <TextQuestion
          id="text-example"
          name="What is your full name?"
          value={responses.textExample || ""}
          onChange={(value) => handleChange("textExample", value)}
          placeholder="Enter your full name"
          required={true}
        />

        <TextareaQuestion
          id="textarea-example"
          name="Tell us about yourself"
          value={responses.textareaExample || ""}
          onChange={(value) => handleChange("textareaExample", value)}
          placeholder="Write a brief description"
          rows={4}
          required={true}
        />

        <BooleanQuestion
          id="boolean-example"
          name="Do you agree to the terms?"
          value={responses.booleanExample || ""}
          onChange={(value) => handleChange("booleanExample", value)}
          required={true}
        />

        <MultipleChoiceQuestion
          id="multiple-choice-example"
          name="What is your preferred programming language?"
          value={responses.multipleChoiceExample || ""}
          onChange={(value) => handleChange("multipleChoiceExample", value)}
          options={["JavaScript", "TypeScript", "Python", "Java", "C#"]}
          required={true}
        />

        <CheckboxQuestion
          id="checkbox-example"
          name="Which technologies are you familiar with?"
          value={responses.checkboxExample || []}
          onChange={(value) => handleChange("checkboxExample", value)}
          options={["React", "Vue", "Angular", "Node.js", "Express", "MongoDB"]}
          required={true}
        />

        <SelectQuestion
          id="select-example"
          name="What is your experience level?"
          value={responses.selectExample || ""}
          onChange={(value) => handleChange("selectExample", value)}
          options={["Beginner", "Intermediate", "Advanced", "Expert"]}
          placeholder="Select your level"
          required={true}
        />

        <NumberQuestion
          id="number-example"
          name="How many years of experience do you have?"
          value={responses.numberExample || ""}
          onChange={(value) => handleChange("numberExample", value)}
          placeholder="Enter number of years"
          min={0}
          max={50}
          step={0.5}
          required={true}
        />

        <DateQuestion
          id="date-example"
          name="What is your birth date?"
          value={responses.dateExample || ""}
          onChange={(value) => handleChange("dateExample", value)}
          required={true}
        />

        <TimeQuestion
          id="time-example"
          name="What time do you prefer for meetings?"
          value={responses.timeExample || ""}
          onChange={(value) => handleChange("timeExample", value)}
          required={true}
        />

        <EmailQuestion
          id="email-example"
          name="What is your email address?"
          value={responses.emailExample || ""}
          onChange={(value) => handleChange("emailExample", value)}
          placeholder="your.email@example.com"
          required={true}
        />

        <UrlQuestion
          id="url-example"
          name="What is your website URL?"
          value={responses.urlExample || ""}
          onChange={(value) => handleChange("urlExample", value)}
          placeholder="https://your-website.com"
          required={false}
        />
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Responses:</h3>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(responses, null, 2)}
        </pre>
      </div>
    </div>
  );
}
