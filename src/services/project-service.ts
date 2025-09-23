import { supabase } from "@/lib/supabase";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  session_count?: number;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  created_by: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
}

export interface ProjectWithAccess {
  project: Project;
  access_level: "creator" | "editor" | "viewer";
}

export const projectService = {
  /**
   * Get all projects the user has access to (as creator or through project_users table)
   */
  async getProjectsByUserAccess(
    userId: string
  ): Promise<{ data: ProjectWithAccess[] | null; error: any }> {
    try {
      // First, get projects where user is the creator
      const { data: createdProjects, error: createdError } = await supabase
        .from("projects")
        .select(
          `
          *,
          sessions(count)
        `
        )
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (createdError) {
        console.error("Error fetching created projects:", createdError);
        return { data: null, error: createdError };
      }

      // Then, get projects where user is a member through project_users table
      const { data: memberProjects, error: memberError } = await supabase
        .from("project_users")
        .select(
          `
          projects!inner(
            *,
            sessions(count)
          )
        `
        )
        .eq("user_id", userId);

      if (memberError) {
        console.error("Error fetching member projects:", memberError);
        return { data: null, error: memberError };
      }

      // Transform created projects
      const createdProjectsWithAccess: ProjectWithAccess[] = (
        createdProjects || []
      ).map((project) => ({
        project: {
          ...project,
          session_count: project.sessions?.[0]?.count || 0,
        },
        access_level: "creator" as const,
      }));

      // Transform member projects
      const memberProjectsWithAccess: ProjectWithAccess[] = (
        memberProjects || []
      ).map((memberProject: any) => ({
        project: {
          ...memberProject.projects,
          session_count: memberProject.projects.sessions?.[0]?.count || 0,
        },
        access_level: "editor" as const, // Default to editor since no role column exists
      }));

      // Combine both arrays and remove duplicates (in case user is both creator and member)
      const allProjects = [
        ...createdProjectsWithAccess,
        ...memberProjectsWithAccess,
      ];
      const uniqueProjects = allProjects.filter(
        (project, index, self) =>
          index === self.findIndex((p) => p.project.id === project.project.id)
      );

      return { data: uniqueProjects, error: null };
    } catch (error) {
      console.error("Error fetching projects by user access:", error);
      return { data: null, error };
    }
  },

  /**
   * Get a specific project by ID (only if user has access)
   */
  async getProjectById(
    projectId: string,
    userId: string
  ): Promise<{ data: ProjectWithAccess | null; error: any }> {
    try {
      // First check if user is the creator
      const { data: createdProject, error: createdError } = await supabase
        .from("projects")
        .select(
          `
          *,
          sessions(count)
        `
        )
        .eq("id", projectId)
        .eq("created_by", userId)
        .single();

      if (!createdError && createdProject) {
        const projectWithAccess: ProjectWithAccess = {
          project: {
            ...createdProject,
            session_count: createdProject.sessions?.[0]?.count || 0,
          },
          access_level: "creator",
        };
        return { data: projectWithAccess, error: null };
      }

      // If not creator, check if user is a member through project_users table
      const { data: memberProject, error: memberError } = await supabase
        .from("project_users")
        .select(
          `
          projects!inner(
            *,
            sessions(count)
          )
        `
        )
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single();

      if (memberError) {
        console.error("Error fetching project by ID:", memberError);
        return { data: null, error: memberError };
      }

      const projectWithAccess: ProjectWithAccess = {
        project: {
          ...(memberProject as any).projects,
          session_count:
            (memberProject as any).projects.sessions?.[0]?.count || 0,
        },
        access_level: "editor" as const, // Default to editor since no role column exists
      };

      return { data: projectWithAccess, error: null };
    } catch (error) {
      console.error("Error fetching project by ID:", error);
      return { data: null, error };
    }
  },

  /**
   * Create a new project
   */
  async createProject(
    projectData: CreateProjectData
  ): Promise<{ data: Project | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...projectData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error creating project:", error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing project (only if user is creator)
   */
  async updateProject(
    projectId: string,
    updateData: UpdateProjectData,
    userId: string
  ): Promise<{ data: Project | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("created_by", userId) // Ensure user is the creator
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error updating project:", error);
      return { data: null, error };
    }
  },

  /**
   * Delete a project (only if user is creator)
   */
  async deleteProject(
    projectId: string,
    userId: string
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("created_by", userId); // Ensure user is the creator

      return { error };
    } catch (error) {
      console.error("Error deleting project:", error);
      return { error };
    }
  },

  /**
   * Check if user has access to a project
   */
  async checkProjectAccess(
    projectId: string,
    userId: string
  ): Promise<{
    hasAccess: boolean;
    accessLevel: "creator" | "editor" | "viewer" | null;
    error: any;
  }> {
    try {
      // First check if user is the creator
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("created_by")
        .eq("id", projectId)
        .single();

      if (projectError) {
        return { hasAccess: false, accessLevel: null, error: projectError };
      }

      if (project.created_by === userId) {
        return { hasAccess: true, accessLevel: "creator", error: null };
      }

      // Then check if user is a member through project_users table
      const { data: memberProject, error: memberError } = await supabase
        .from("project_users")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single();

      if (memberError) {
        // If no member record found, user doesn't have access
        return { hasAccess: false, accessLevel: null, error: null };
      }

      return {
        hasAccess: true,
        accessLevel: "editor" as const, // Default to editor since no role column exists
        error: null,
      };
    } catch (error) {
      console.error("Error checking project access:", error);
      return { hasAccess: false, accessLevel: null, error };
    }
  },

  /**
   * Get project statistics
   */
  async getProjectStats(
    projectId: string,
    userId: string
  ): Promise<{
    data: { sessionCount: number; totalObservations: number } | null;
    error: any;
  }> {
    try {
      // First check if user has access
      const { hasAccess, error: accessError } = await this.checkProjectAccess(
        projectId,
        userId
      );
      if (!hasAccess || accessError) {
        return {
          data: null,
          error: accessError || new Error("No access to project"),
        };
      }

      // Get session count
      const { count: sessionCount, error: sessionError } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (sessionError) {
        return { data: null, error: sessionError };
      }

      // Get total observations count
      const { count: totalObservations, error: observationsError } =
        await supabase
          .from("observations")
          .select("*", { count: "exact", head: true })
          .in(
            "session_id",
            // We need to get session IDs first, but for now we'll use a simpler approach
            // This could be optimized with a more complex query
            []
          );

      return {
        data: {
          sessionCount: sessionCount || 0,
          totalObservations: totalObservations || 0,
        },
        error: null,
      };
    } catch (error) {
      console.error("Error getting project stats:", error);
      return { data: null, error };
    }
  },

  /**
   * Add a user to a project
   */
  async addUserToProject(
    projectId: string,
    userId: string,
    role: "editor" | "viewer", // Role parameter kept for API compatibility but not stored
    addedBy: string
  ): Promise<{ error: any }> {
    try {
      // First check if the person adding the user has permission (creator or editor)
      const { hasAccess, accessLevel } = await this.checkProjectAccess(
        projectId,
        addedBy
      );
      if (
        !hasAccess ||
        (accessLevel !== "creator" && accessLevel !== "editor")
      ) {
        return { error: new Error("Insufficient permissions to add users") };
      }

      const { error } = await supabase.from("project_users").insert({
        project_id: projectId,
        user_id: userId,
        added_by: addedBy,
        created_at: new Date().toISOString(),
      });

      return { error };
    } catch (error) {
      console.error("Error adding user to project:", error);
      return { error };
    }
  },

  /**
   * Remove a user from a project
   */
  async removeUserFromProject(
    projectId: string,
    userId: string,
    removedBy: string
  ): Promise<{ error: any }> {
    try {
      // First check if the person removing the user has permission (creator or editor)
      const { hasAccess, accessLevel } = await this.checkProjectAccess(
        projectId,
        removedBy
      );
      if (
        !hasAccess ||
        (accessLevel !== "creator" && accessLevel !== "editor")
      ) {
        return { error: new Error("Insufficient permissions to remove users") };
      }

      // Don't allow removing the creator
      const { data: project } = await supabase
        .from("projects")
        .select("created_by")
        .eq("id", projectId)
        .single();

      if (project?.created_by === userId) {
        return { error: new Error("Cannot remove project creator") };
      }

      const { error } = await supabase
        .from("project_users")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      return { error };
    } catch (error) {
      console.error("Error removing user from project:", error);
      return { error };
    }
  },

  /**
   * Get all users in a project
   */
  async getProjectUsers(
    projectId: string,
    requesterId: string
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      // First check if the requester has access to the project
      const { hasAccess } = await this.checkProjectAccess(
        projectId,
        requesterId
      );
      if (!hasAccess) {
        return { data: null, error: new Error("No access to project") };
      }

      const { data, error } = await supabase
        .from("project_users")
        .select(
          `
          *,
          users!inner(
            id,
            email,
            created_at
          )
        `
        )
        .eq("project_id", projectId);

      return { data, error };
    } catch (error) {
      console.error("Error getting project users:", error);
      return { data: null, error };
    }
  },
};
