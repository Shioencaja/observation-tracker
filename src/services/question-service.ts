import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";

export interface QuestionUpdateData {
  name?: string;
  question_type?: string;
  options?: string[];
  is_visible?: boolean;
  order?: number;
}

export interface QuestionCreateData {
  name: string;
  question_type: string;
  options?: string[];
  is_visible?: boolean;
  order?: number;
  project_id: string;
}

export class QuestionService {
  /**
   * Create a new question/observation option
   */
  static async createQuestion(
    data: QuestionCreateData
  ): Promise<Tables<"project_observation_options">> {
    const { data: question, error } = await supabase
      .from("project_observation_options")
      .insert([data])
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating question: ${error.message}`);
    }

    return question;
  }

  /**
   * Update an existing question/observation option
   */
  static async updateQuestion(
    questionId: string,
    data: QuestionUpdateData
  ): Promise<Tables<"project_observation_options">> {
    const { data: question, error } = await supabase
      .from("project_observation_options")
      .update(data)
      .eq("id", questionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating question: ${error.message}`);
    }

    return question;
  }

  /**
   * Delete a question/observation option
   */
  static async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from("project_observation_options")
      .delete()
      .eq("id", questionId);

    if (error) {
      throw new Error(`Error deleting question: ${error.message}`);
    }
  }

  /**
   * Toggle question visibility
   */
  static async toggleQuestionVisibility(
    questionId: string,
    isVisible: boolean
  ): Promise<Tables<"project_observation_options">> {
    return this.updateQuestion(questionId, { is_visible: isVisible });
  }

  /**
   * Reorder questions
   */
  static async reorderQuestions(
    questionIds: string[],
    projectId: string
  ): Promise<Tables<"project_observation_options">[]> {
    const updates = questionIds.map((id, index) => ({
      id,
      order: index + 1,
    }));

    const { data: questions, error } = await supabase
      .from("project_observation_options")
      .upsert(updates)
      .eq("project_id", projectId)
      .select()
      .order("order", { ascending: true });

    if (error) {
      throw new Error(`Error reordering questions: ${error.message}`);
    }

    return questions || [];
  }

  /**
   * Get all questions for a project
   */
  static async getProjectQuestions(
    projectId: string
  ): Promise<Tables<"project_observation_options">[]> {
    const { data: questions, error } = await supabase
      .from("project_observation_options")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(`Error fetching questions: ${error.message}`);
    }

    return questions || [];
  }

  /**
   * Duplicate a question
   */
  static async duplicateQuestion(
    questionId: string,
    projectId: string
  ): Promise<Tables<"project_observation_options">> {
    // First get the original question
    const { data: originalQuestion, error: fetchError } = await supabase
      .from("project_observation_options")
      .select("*")
      .eq("id", questionId)
      .single();

    if (fetchError) {
      throw new Error(
        `Error fetching original question: ${fetchError.message}`
      );
    }

    // Get the next order number
    const { data: lastQuestion, error: orderError } = await supabase
      .from("project_observation_options")
      .select("order")
      .eq("project_id", projectId)
      .order("order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = lastQuestion ? lastQuestion.order + 1 : 1;

    // Create the duplicate
    const duplicateData: QuestionCreateData = {
      name: `${originalQuestion.name} (Copia)`,
      question_type: originalQuestion.question_type,
      options: originalQuestion.options,
      is_visible: originalQuestion.is_visible,
      order: nextOrder,
      project_id: projectId,
    };

    return this.createQuestion(duplicateData);
  }
}

export const questionService = QuestionService;
