// Utility functions for filtering and displaying questions based on conditional logic

export interface Question {
  id: string;
  name: string;
  question_type: string;
  options: string[];
  is_mandatory?: boolean;
  depends_on_question_id?: string | null; // DEPRECATED: Legacy support
  depends_on_answer?: string | null; // DEPRECATED: Legacy support
  next_question_map?: Record<string, string | null> | null; // Maps answer option value to next question ID
}

export interface NormalizedOption {
  id: string;
  value: string;
}

// Helper function to normalize values for comparison
export function normalizeValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    // For arrays (checkbox), join with comma for comparison
    return value.join(",");
  }
  return String(value);
}

// Helper to normalize options (convert string[] to option objects if needed)
export function normalizeQuestionOptions(
  options: any[],
  questionId: string
): NormalizedOption[] {
  if (!options || options.length === 0) return [];
  // Check if already in option object format
  if (
    typeof options[0] === "object" &&
    "id" in options[0] &&
    "value" in options[0]
  ) {
    return options as NormalizedOption[];
  }
  // Convert string array to option objects with deterministic IDs
  return (options as string[]).map((value, index) => {
    const idBase = questionId
      ? `${questionId}_${value}`
      : `opt_${index}_${value}`;
    return {
      id: `opt_${idBase.replace(/[^a-zA-Z0-9_]/g, "_")}`,
      value: value,
    };
  });
}

// Extract response value from various formats (ID, value, array, etc.)
export function extractResponseValue(
  currentResponse: any,
  questionOptions: NormalizedOption[],
  questionId: string
): string {
  let responseValue: string = "";

  // Handle case where currentResponse might be a JSON string or object
  let parsedResponse: any = currentResponse;

  // First, check if it's already an object (not a string)
  if (
    typeof currentResponse === "object" &&
    currentResponse !== null &&
    !Array.isArray(currentResponse)
  ) {
    // If it has a 'value' property, use that (it's already the option value)
    if ("value" in currentResponse) {
      parsedResponse = currentResponse.value;
    } else if ("id" in currentResponse) {
      // If it only has an 'id', we need to find the option and get its value
      parsedResponse = currentResponse.id;
    }
  } else if (
    typeof currentResponse === "string" &&
    currentResponse.trim().startsWith("{")
  ) {
    // It's a JSON string, parse it
    try {
      parsedResponse = JSON.parse(currentResponse);
      // If it's a JSON object with an 'id' or 'value' property, extract the appropriate field
      if (parsedResponse && typeof parsedResponse === "object") {
        // If it has a 'value' property, use that (it's already the option value)
        if ("value" in parsedResponse) {
          parsedResponse = parsedResponse.value;
        } else if ("id" in parsedResponse) {
          // If it only has an 'id', we need to find the option and get its value
          parsedResponse = parsedResponse.id;
        }
      }
    } catch (e) {
      // Not valid JSON, use as-is
      parsedResponse = currentResponse;
    }
  }

  // Quick check: if parsedResponse matches an option ID exactly, use that option's value
  // This is the most reliable method since IDs are generated deterministically
  const directOptionMatch = questionOptions.find(
    (opt) => opt.id === parsedResponse || opt.id === currentResponse
  );
  if (directOptionMatch) {
    responseValue = directOptionMatch.value;
  } else {
    // Debug: Log when exact ID match fails for "banca"
    if (
      parsedResponse &&
      String(parsedResponse).toLowerCase().includes("banca")
    ) {
      console.log("DEBUG: No directOptionMatch found:", {
        currentResponse,
        parsedResponse,
        questionOptionsIds: questionOptions.map((opt) => opt.id),
        questionOptionsValues: questionOptions.map((opt) => opt.value),
      });
    }
    // If no exact ID match, check if parsedResponse is already a value (not an ID)
    // This handles cases where responses are stored as values (new format)
    const valueMatch = questionOptions.find(
      (opt) => opt.value === parsedResponse || opt.value === currentResponse
    );
    if (valueMatch) {
      // Response is already a value, use it directly
      responseValue = valueMatch.value;
    } else {
      // If response is an array (checkbox), use the first value
      if (Array.isArray(parsedResponse)) {
        if (parsedResponse.length > 0) {
          // For checkbox, try to find the option value for the first selected option
          const firstResponse = parsedResponse[0];
          const matchedOption = questionOptions.find(
            (opt) => opt.id === firstResponse || opt.value === firstResponse
          );
          responseValue = matchedOption
            ? matchedOption.value
            : normalizeValue(firstResponse);
        }
      } else {
        // For single-value responses (radio, select, etc.)
        // Try to find the option that matches the response (could be ID or value)
        let matchedOption = questionOptions.find(
          (opt) =>
            opt.id === parsedResponse ||
            opt.value === parsedResponse ||
            opt.id === currentResponse ||
            opt.value === currentResponse
        );

        // If still no match, try case-insensitive matching
        if (!matchedOption && parsedResponse) {
          matchedOption = questionOptions.find(
            (opt) =>
              opt.id.toLowerCase() === String(parsedResponse).toLowerCase() ||
              opt.value.toLowerCase() ===
                String(parsedResponse).toLowerCase() ||
              opt.id.toLowerCase() === String(currentResponse).toLowerCase() ||
              opt.value.toLowerCase() === String(currentResponse).toLowerCase()
          );
        }

        // If we found a match, use its value
        if (matchedOption) {
          responseValue = matchedOption.value;
        } else {
          // If no match found, the response might be an ID that we need to match
          // Try to find by matching the ID pattern or extracting from it
          const responseToCheck =
            typeof parsedResponse === "string"
              ? parsedResponse
              : typeof currentResponse === "string"
              ? currentResponse
              : String(currentResponse);
          if (responseToCheck.startsWith("opt_")) {
            // First, try to find an option whose ID matches exactly
            // This is the most reliable method since IDs are generated deterministically
            const exactIdMatch = questionOptions.find(
              (opt) => opt.id === responseToCheck || opt.id === currentResponse
            );

            if (exactIdMatch) {
              responseValue = exactIdMatch.value;
            } else {
              // Extract value from ID pattern
              // ID format from normalizeQuestionOptions: opt_{sanitizedQuestionId}_{value}
              // where sanitizedQuestionId = questionId.replace(/[^a-zA-Z0-9_]/g, "_")
              // So we need to extract the value part after the question ID

              // First, create the expected prefix pattern
              const sanitizedQuestionId = questionId.replace(
                /[^a-zA-Z0-9_]/g,
                "_"
              );
              const expectedPrefix = `opt_${sanitizedQuestionId}_`;

              // Try to match by finding the question ID in the response ID
              // The ID format might be: opt_{uuid}_{value} or opt_{sanitizedQuestionId}_{value}
              // We need to find where the actual value part starts
              let extractedFromId: string | null = null;

              // Method 1: Try the expected prefix pattern
              if (responseToCheck.startsWith(expectedPrefix)) {
                extractedFromId = responseToCheck.substring(
                  expectedPrefix.length
                );
              } else {
                // Method 2: The ID might have a different format (e.g., UUID-based)
                // Since IDs are generated deterministically, try to match by generating
                // the expected ID for each option and comparing
                let matchedOption = questionOptions.find((opt) => {
                  // Generate the expected ID for this option using the same logic
                  const idBase = `${questionId}_${opt.value}`;
                  const expectedId = `opt_${idBase.replace(
                    /[^a-zA-Z0-9_]/g,
                    "_"
                  )}`;
                  return (
                    expectedId === responseToCheck ||
                    expectedId === currentResponse
                  );
                });

                if (matchedOption) {
                  responseValue = matchedOption.value;
                } else {
                  // If exact ID match fails, try matching by comparing normalized values
                  // Split the ID and try to find which option value matches
                  const parts = responseToCheck.split("_");

                  // Normalization function that removes accents and spaces for comparison
                  const normalizeForMatch = (str: string) =>
                    str
                      .toLowerCase()
                      .replace(/_/g, " ")
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "") // Remove accents
                      .replace(/\s+/g, "") // Remove all spaces for comparison
                      .trim();

                  // Try matching different slices of the ID parts
                  // Start from the end and work backwards, as the value is typically at the end
                  let foundMatch = false;
                  for (
                    let startIdx = parts.length - 1;
                    startIdx >= 2 && !foundMatch;
                    startIdx--
                  ) {
                    // Try slices of increasing length from this start position
                    for (
                      let endIdx = parts.length;
                      endIdx > startIdx && !foundMatch;
                      endIdx--
                    ) {
                      const possibleValue = parts
                        .slice(startIdx, endIdx)
                        .join("_");

                      // Try to match this against option values
                      const testMatch = questionOptions.find((opt) => {
                        const normalizedOptValue = normalizeForMatch(opt.value);
                        const normalizedPossibleValue =
                          normalizeForMatch(possibleValue);
                        return normalizedOptValue === normalizedPossibleValue;
                      });

                      if (testMatch) {
                        // Found a match - use the actual option value (with accents)
                        responseValue = testMatch.value;
                        foundMatch = true;
                        break;
                      }
                    }
                  }

                  // If still not found, try the last 5 parts (most likely contains the value)
                  if (!responseValue && parts.length >= 3) {
                    const possibleValueParts = parts.slice(-5).join("_");
                    const testMatch = questionOptions.find((opt) => {
                      const normalizedOptValue = normalizeForMatch(opt.value);
                      const normalizedPossibleValue =
                        normalizeForMatch(possibleValueParts);
                      return normalizedOptValue === normalizedPossibleValue;
                    });

                    if (testMatch) {
                      responseValue = testMatch.value;
                    } else {
                      extractedFromId = possibleValueParts;
                    }
                  }
                }
              }

              // Only continue with extraction if we haven't found a match yet
              if (!responseValue && extractedFromId) {
                // Try to find an option that matches this extracted value
                // The option value might have spaces instead of underscores, and accents
                // When IDs are generated, special chars are replaced with underscores,
                // so "teléfono" becomes "tel_fono" in the ID, but "teléfono" in the value
                // We need to match these by normalizing both and removing underscores from the extracted value

                const normalizeForOptionMatch = (str: string) =>
                  str
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .replace(/[^a-z0-9\s]/g, "") // Remove special chars except spaces
                    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
                    .trim();

                // For the extracted value, we need to remove underscores and treat them as spaces
                // because the ID generation replaced spaces and special chars with underscores
                const normalizeExtractedValue = (str: string) =>
                  str
                    .toLowerCase()
                    .replace(/_/g, " ") // Replace underscores with spaces
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .replace(/[^a-z0-9\s]/g, "") // Remove special chars except spaces
                    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
                    .trim();

                const valueMatch = questionOptions.find((opt) => {
                  // Method 1: Try exact match first
                  if (opt.value === extractedFromId) return true;

                  // Method 2: Check if the currentResponse matches the option's ID exactly
                  // This is the most reliable since IDs are generated deterministically
                  if (opt.id === currentResponse) {
                    return true;
                  }

                  // Method 3: Try with underscores replaced by spaces (case-insensitive)
                  const normalizedExtracted = extractedFromId.replace(
                    /_/g,
                    " "
                  );
                  const normalizedOption = opt.value.replace(/_/g, " ");
                  if (
                    normalizedExtracted.toLowerCase() ===
                    normalizedOption.toLowerCase()
                  ) {
                    return true;
                  }

                  // Method 4: Try accent-insensitive matching with proper normalization
                  // The extracted value has underscores, the option value has spaces
                  const normalizedExtractedForMatch =
                    normalizeExtractedValue(extractedFromId);
                  const normalizedOptionForMatch = normalizeForOptionMatch(
                    opt.value
                  );
                  if (
                    normalizedExtractedForMatch === normalizedOptionForMatch
                  ) {
                    return true;
                  }

                  // Method 5: Try matching by comparing the option's ID parts with the extracted value
                  // The option ID was generated the same way, so parts should match
                  const optIdParts = opt.id.split("_");
                  const extractedParts = extractedFromId.split("_");
                  // Check if the extracted value matches the value part of the option ID
                  // The option ID format is: opt_{questionId}_{valuePart1}_{valuePart2}...
                  // So we need to extract just the value parts (everything after the question ID)
                  const questionIdPrefix = questionId.replace(
                    /[^a-zA-Z0-9_]/g,
                    "_"
                  );
                  const optValuePart = optIdParts
                    .slice(
                      optIdParts.findIndex(
                        (part) => part === questionIdPrefix
                      ) + 1
                    )
                    .join("_");
                  if (optValuePart === extractedFromId) {
                    return true;
                  }

                  // Method 6: Try matching the last few parts (handles multi-word values)
                  if (optIdParts.length >= 2 && extractedParts.length >= 2) {
                    // Compare the last 2-3 parts (handles multi-word values)
                    const optValueParts = optIdParts.slice(-3).join(" ");
                    const extValueParts = extractedParts.slice(-3).join(" ");
                    const normalizedOptParts =
                      normalizeForOptionMatch(optValueParts);
                    const normalizedExtParts =
                      normalizeExtractedValue(extValueParts);
                    if (normalizedOptParts === normalizedExtParts) {
                      return true;
                    }
                  }
                  return false;
                });

                if (valueMatch) {
                  // Use the actual option value (with spaces, not underscores)
                  responseValue = valueMatch.value;
                } else {
                  // Fallback: try to match against option values more flexibly
                  // The extracted value might have special characters removed (e.g., "é" -> "e")
                  // So we need to find the option whose value matches when normalized
                  const normalizeForMatching = (str: string) =>
                    str
                      .toLowerCase()
                      .replace(/_/g, " ")
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "") // Remove accents
                      .replace(/[^a-z0-9\s]/g, "") // Remove special chars
                      .replace(/\s+/g, " ") // Normalize spaces
                      .trim();

                  const normalizedExtracted =
                    normalizeForMatching(extractedFromId);
                  const flexibleMatch = questionOptions.find((opt) => {
                    const normalizedOpt = normalizeForMatching(opt.value);
                    return normalizedOpt === normalizedExtracted;
                  });

                  if (flexibleMatch) {
                    // Use the actual option value (with accents) from the database
                    responseValue = flexibleMatch.value;
                  } else {
                    // Try one more approach: match the extracted value parts against option values
                    // by trying to find the option whose normalized value matches
                    const extractedNormalized = extractedFromId
                      .toLowerCase()
                      .replace(/_/g, " ")
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .trim();

                    const finalMatch = questionOptions.find((opt) => {
                      const optNormalized = opt.value
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .trim();
                      return optNormalized === extractedNormalized;
                    });

                    if (finalMatch) {
                      responseValue = finalMatch.value;
                    } else {
                      // Last resort: try to find by matching the option ID directly
                      // This is the most reliable method since IDs are generated deterministically
                      const idMatch = questionOptions.find(
                        (opt) => opt.id === currentResponse
                      );
                      if (idMatch) {
                        responseValue = idMatch.value;
                      } else {
                        // Ultimate fallback: try to find any option that contains the extracted words
                        const extractedWords = extractedFromId
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .split(" ")
                          .filter((w) => w.length > 2);

                        const wordMatch = questionOptions.find((opt) => {
                          const optWords = opt.value
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .split(" ")
                            .filter((w) => w.length > 2);
                          // Check if all extracted words are in the option value
                          return extractedWords.every((word) =>
                            optWords.some(
                              (optWord) =>
                                optWord.includes(word) || word.includes(optWord)
                            )
                          );
                        });

                        if (wordMatch) {
                          responseValue = wordMatch.value;
                        } else {
                          // Really last resort: use extracted value with spaces (will lose accents)
                          responseValue = extractedFromId.replace(/_/g, " ");
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {
            // If responseToCheck doesn't start with "opt_", normalize it
            responseValue = normalizeValue(responseToCheck);
          }
        }
      }
    }
  }

  // Final safety check: if responseValue is still a JSON string, try to extract the value
  if (
    typeof responseValue === "string" &&
    responseValue.trim().startsWith("{")
  ) {
    try {
      const parsed = JSON.parse(responseValue);
      if (parsed && typeof parsed === "object" && "value" in parsed) {
        responseValue = parsed.value;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Debug logging to see what we're returning
  if (
    responseValue &&
    typeof responseValue === "string" &&
    responseValue.toLowerCase().includes("banca")
  ) {
    console.log("DEBUG extractResponseValue returning:", {
      responseValue,
      type: typeof responseValue,
      isJSON:
        typeof responseValue === "string" &&
        responseValue.trim().startsWith("{"),
    });
  }

  return responseValue;
}

// Find next question ID from next_question_map based on response value
export function findNextQuestionId(
  responseValue: string,
  nextQuestionMap: Record<string, string | null>
): { nextQuestionId: string | null; hasMapping: boolean } {
  let nextQuestionId: string | null = null;
  let hasMapping = false;

  // Clean the responseValue to match map keys
  const cleanResponseValue =
    responseValue &&
    !responseValue.startsWith("opt_") &&
    responseValue.length < 100
      ? responseValue
      : null;

  // Try exact match first
  if (cleanResponseValue && cleanResponseValue in nextQuestionMap) {
    hasMapping = true;
    nextQuestionId = nextQuestionMap[cleanResponseValue];
    return { nextQuestionId, hasMapping };
  }

  // Fallback: try with the original responseValue
  if (responseValue && responseValue in nextQuestionMap) {
    hasMapping = true;
    nextQuestionId = nextQuestionMap[responseValue];
    return { nextQuestionId, hasMapping };
  }

  // Try normalized matching (case-insensitive, space/underscore-insensitive)
  const mapKeys = Object.keys(nextQuestionMap);
  const normalizeForComparison = (str: string) =>
    str
      .toLowerCase()
      .replace(/_/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s]/g, "") // Remove special chars except spaces
      .trim();

  const normalizedResponseValue = normalizeForComparison(
    cleanResponseValue || responseValue || ""
  );

  // Debug logging for "banca"
  if (responseValue && responseValue.toLowerCase().includes("banca")) {
    console.log("DEBUG findNextQuestionId:", {
      responseValue,
      cleanResponseValue,
      normalizedResponseValue,
      mapKeys,
      normalizedMapKeys: mapKeys.map((k) => ({
        key: k,
        normalized: normalizeForComparison(k),
      })),
    });
  }

  const matchedKey = mapKeys.find((key) => {
    const normalizedKey = normalizeForComparison(key);
    return normalizedKey === normalizedResponseValue;
  });

  if (matchedKey) {
    hasMapping = true;
    nextQuestionId = nextQuestionMap[matchedKey];

    // Debug logging for match
    if (responseValue && responseValue.toLowerCase().includes("banca")) {
      console.log("DEBUG: Found matched key:", {
        matchedKey,
        nextQuestionId,
        hasMapping,
      });
    }
  } else {
    // Debug logging for no match
    if (responseValue && responseValue.toLowerCase().includes("banca")) {
      console.log("DEBUG: No matched key found. Normalized comparison:", {
        normalizedResponseValue,
        normalizedMapKeys: mapKeys.map((k) => normalizeForComparison(k)),
      });
    }
  }

  return { nextQuestionId, hasMapping };
}

// Calculate questions to show using next_question_map logic
export function calculateQuestionsWithNextQuestionMap(
  allQuestions: Question[],
  responses: Record<string, any>,
  normalizeQuestionOptionsFn: (
    options: any[],
    questionId: string
  ) => NormalizedOption[]
): Question[] {
  const questionsToShow: Question[] = [];
  const visitedQuestions = new Set<string>();

  // Start with the first question
  let currentQuestion = allQuestions[0];
  let attempts = 0;
  const maxAttempts = allQuestions.length * 3; // Prevent infinite loops

  while (currentQuestion && attempts < maxAttempts) {
    attempts++;

    // Add current question if not already added
    if (!visitedQuestions.has(currentQuestion.id)) {
      questionsToShow.push(currentQuestion);
      visitedQuestions.add(currentQuestion.id);
    }

    // Check if current question has been answered
    const currentResponse = responses[currentQuestion.id];
    const hasResponse =
      currentResponse !== null &&
      currentResponse !== undefined &&
      currentResponse !== "" &&
      !(Array.isArray(currentResponse) && currentResponse.length === 0);

    if (!hasResponse) {
      // Question hasn't been answered yet, stop here
      break;
    }

    // Question has been answered - check if we should jump to a specific next question
    if (
      currentQuestion.next_question_map &&
      Object.keys(currentQuestion.next_question_map).length > 0
    ) {
      const questionOptions = normalizeQuestionOptionsFn(
        currentQuestion.options || [],
        currentQuestion.id
      );

      const responseValue = extractResponseValue(
        currentResponse,
        questionOptions,
        currentQuestion.id
      );

      // Debug logging for "banca por teléfono"
      if (responseValue && responseValue.toLowerCase().includes("banca")) {
        console.log("DEBUG next_question_map lookup:", {
          question: currentQuestion.name,
          currentResponse,
          responseValue,
          mapKeys: Object.keys(currentQuestion.next_question_map || {}),
          fullMap: currentQuestion.next_question_map,
        });
      }

      const { nextQuestionId, hasMapping } = findNextQuestionId(
        responseValue,
        currentQuestion.next_question_map
      );

      // Debug logging for mapping result
      if (responseValue && responseValue.toLowerCase().includes("banca")) {
        console.log("DEBUG mapping result:", {
          hasMapping,
          nextQuestionId,
          responseValue,
        });
      }

      if (hasMapping) {
        if (nextQuestionId) {
          // Mapping points to a specific question - jump to it
          const nextQuestion = allQuestions.find(
            (q) => q.id === nextQuestionId
          );
          if (nextQuestion) {
            // If we've already visited this question, we're in a loop - break
            if (visitedQuestions.has(nextQuestionId)) {
              break;
            }
            // Jump directly to the mapped question
            currentQuestion = nextQuestion;
            continue;
          } else {
            // If mapped question not found, stop the flow
            break;
          }
        } else {
          // Mapping is null - this means we should STOP showing questions
          if (responseValue && responseValue.toLowerCase().includes("banca")) {
            console.log(
              "DEBUG: Stopping flow because nextQuestionId is null for:",
              responseValue
            );
          }
          break;
        }
      } else {
        // If hasMapping is false, it means the answer doesn't have a mapping
        // If the question has a next_question_map defined, it means we're using the new mapping system
        // In this case, if the answer is not in the map, we should STOP showing questions
        // (because the map explicitly defines which answers lead to which questions)
        // Only continue if the question doesn't have a next_question_map at all
        if (
          currentQuestion.next_question_map &&
          Object.keys(currentQuestion.next_question_map).length > 0
        ) {
          // Question has a mapping but answer doesn't match - stop here
          if (responseValue && responseValue.toLowerCase().includes("banca")) {
            console.log(
              "DEBUG: Stopping because answer not in next_question_map:",
              {
                responseValue,
                mapKeys: Object.keys(currentQuestion.next_question_map),
              }
            );
          }
          break;
        }
        // If no next_question_map, fall through to default order logic
      }
      // Fall through to default order logic if no mapping found (and no next_question_map)
    }

    // If no next_question_map, or no match found, move to next question in order
    const currentIndex = allQuestions.findIndex(
      (q) => q.id === currentQuestion.id
    );
    if (currentIndex >= 0 && currentIndex < allQuestions.length - 1) {
      const nextQuestionInOrder = allQuestions[currentIndex + 1];
      // If we've already visited this question, we're done
      if (visitedQuestions.has(nextQuestionInOrder.id)) {
        break;
      }
      currentQuestion = nextQuestionInOrder;
      continue;
    } else {
      // We've reached the end of the questions
      break;
    }
  }

  return questionsToShow;
}

// Filter questions based on legacy depends_on_question_id logic
export function filterQuestionsByLegacyLogic(
  allQuestions: Question[],
  responses: Record<string, any>,
  normalizeQuestionOptionsFn: (
    options: any[],
    questionId: string
  ) => NormalizedOption[]
): Question[] {
  return allQuestions.filter((question): boolean => {
    // Always show if no conditional logic
    if (!question.depends_on_question_id) {
      return true;
    }

    // Get the question this depends on by ID
    const dependencyQuestion = allQuestions.find(
      (q) => q.id === question.depends_on_question_id
    );

    if (!dependencyQuestion) {
      console.warn(
        `Dependency question not found: ${question.depends_on_question_id}`
      );
      return true; // Show if dependency not found
    }

    // Get the response for the dependency question
    const dependencyResponse = responses[dependencyQuestion.id];

    // If dependency question hasn't been answered, hide the dependent question
    if (dependencyResponse === null || dependencyResponse === undefined) {
      return false;
    }

    // Handle empty string - for boolean questions, empty string means not answered
    if (dependencyResponse === "") {
      if (dependencyQuestion.question_type === "boolean") {
        return false;
      }
    }

    // If depends_on_answer is null/undefined/empty, hide the question
    if (
      !question.depends_on_answer ||
      question.depends_on_answer === null ||
      question.depends_on_answer === ""
    ) {
      return false;
    }

    // Get the dependency question's options as option objects
    const dependencyOptions = normalizeQuestionOptionsFn(
      dependencyQuestion.options || [],
      dependencyQuestion.id || ""
    );

    // Find the option object that matches the response value
    const matchedOption = dependencyOptions.find((opt) => {
      const normalizedOptValue = normalizeValue(opt.value);
      const normalizedResponse = normalizeValue(dependencyResponse);
      return normalizedOptValue === normalizedResponse;
    });

    // Check if this is a "is not" condition (prefixed with "!")
    const isNotCondition = question.depends_on_answer?.startsWith("!") || false;
    const actualAnswerId = isNotCondition
      ? question.depends_on_answer.substring(1)
      : question.depends_on_answer;

    // If depends_on_answer is an option ID, compare IDs
    if (matchedOption && actualAnswerId) {
      const matches = matchedOption.id === actualAnswerId;
      const shouldShow = isNotCondition ? !matches : matches;
      return shouldShow;
    }

    // Fallback: Compare by value
    const normalizedResponse = normalizeValue(dependencyResponse);
    const normalizedAnswer = normalizeValue(actualAnswerId);

    // For checkbox/array responses, check if the answer is included in the array
    if (Array.isArray(dependencyResponse)) {
      const matches =
        dependencyResponse.includes(actualAnswerId) ||
        dependencyResponse.some(
          (item) => normalizeValue(item) === normalizedAnswer
        );
      const shouldShow = isNotCondition ? !matches : matches;
      return shouldShow;
    }

    // Compare normalized values
    const matches = normalizedResponse === normalizedAnswer;
    const shouldShow = isNotCondition ? !matches : matches;

    return shouldShow;
  });
}

// Main function to calculate which questions to display
export function calculateDisplayQuestions(
  allQuestions: Question[],
  responses: Record<string, any>,
  normalizeQuestionOptionsFn: (
    options: any[],
    questionId: string
  ) => NormalizedOption[]
): Question[] {
  if (allQuestions.length === 0) return [];

  // Check if any question uses next_question_map (new logic)
  const hasNextQuestionMap = allQuestions.some(
    (q) =>
      q.next_question_map && Object.keys(q.next_question_map || {}).length > 0
  );

  if (hasNextQuestionMap) {
    return calculateQuestionsWithNextQuestionMap(
      allQuestions,
      responses,
      normalizeQuestionOptionsFn
    );
  } else {
    // LEGACY LOGIC: Filter based on old depends_on_question_id logic
    return filterQuestionsByLegacyLogic(
      allQuestions,
      responses,
      normalizeQuestionOptionsFn
    );
  }
}
