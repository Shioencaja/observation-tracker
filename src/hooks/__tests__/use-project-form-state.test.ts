import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectFormState } from '../use-project-form-state';
import type { Project } from '@/types/observation';

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  agencies: ['Agency 1', 'Agency 2'],
  created_by: 'user-1',
  is_finished: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('useProjectFormState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize form state from project', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    expect(result.current.formState.name).toBe('Test Project');
    expect(result.current.formState.description).toBe('Test Description');
    expect(result.current.formState.agencies).toEqual(['Agency 1', 'Agency 2']);
  });

  it('should handle null project', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: null })
    );

    expect(result.current.formState.name).toBe('');
    expect(result.current.formState.description).toBe('');
    expect(result.current.formState.agencies).toEqual([]);
  });

  it('should update single field', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    act(() => {
      result.current.updateField('name', 'Updated Name');
    });

    expect(result.current.formState.name).toBe('Updated Name');
    expect(result.current.formState.description).toBe('Test Description');
  });

  it('should update multiple fields', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    act(() => {
      result.current.updateFields({
        name: 'New Name',
        description: 'New Description',
      });
    });

    expect(result.current.formState.name).toBe('New Name');
    expect(result.current.formState.description).toBe('New Description');
  });

  it('should reset form to project values', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    // Make changes
    act(() => {
      result.current.updateField('name', 'Changed Name');
      result.current.updateField('description', 'Changed Description');
    });

    expect(result.current.formState.name).toBe('Changed Name');

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formState.name).toBe('Test Project');
    expect(result.current.formState.description).toBe('Test Description');
  });

  it('should detect unsaved changes', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.updateField('name', 'Changed Name');
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should detect changes in agencies array', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.updateField('agencies', ['Agency 1', 'Agency 3']);
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should not detect changes when values match', () => {
    const { result } = renderHook(() =>
      useProjectFormState({ project: mockProject })
    );

    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.updateField('name', 'Test Project');
      result.current.updateField('description', 'Test Description');
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should call onUnsavedChangesChange callback', () => {
    const onUnsavedChangesChange = vi.fn();
    const { result } = renderHook(() =>
      useProjectFormState({
        project: mockProject,
        onUnsavedChangesChange,
      })
    );

    act(() => {
      result.current.updateField('name', 'Changed');
    });

    expect(onUnsavedChangesChange).toHaveBeenCalledWith(true);
  });

  it('should handle empty description', () => {
    const projectWithoutDescription: Project = {
      ...mockProject,
      description: null,
    };

    const { result } = renderHook(() =>
      useProjectFormState({ project: projectWithoutDescription })
    );

    expect(result.current.formState.description).toBe('');
  });

  it('should handle empty agencies array', () => {
    const projectWithoutAgencies: Project = {
      ...mockProject,
      agencies: null,
    };

    const { result } = renderHook(() =>
      useProjectFormState({ project: projectWithoutAgencies })
    );

    expect(result.current.formState.agencies).toEqual([]);
  });

  it('should update when project changes', () => {
    const { result, rerender } = renderHook(
      ({ project }) => useProjectFormState({ project }),
      {
        initialProps: { project: mockProject },
      }
    );

    const newProject: Project = {
      ...mockProject,
      name: 'New Project Name',
    };

    rerender({ project: newProject });

    expect(result.current.formState.name).toBe('New Project Name');
  });
});

