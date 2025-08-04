import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Fetch team members
export const useTeamMembers = (params?: any) => {
  return useQuery({
    queryKey: ['team', 'members', params],
    queryFn: () => teamAPI.getMembers(params),
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch single team member
export const useTeamMember = (id: string) => {
  return useQuery({
    queryKey: ['team', 'member', id],
    queryFn: () => teamAPI.getMember(id),
    enabled: !!id,
  });
};

// Create team member
export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: teamAPI.addMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Team member created successfully');
    },
  });
};

// Update team member
export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      teamAPI.updateMember(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'member', variables.id] });
      toast.success('Team member updated successfully');
    },
  });
};

// Delete team member
export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: teamAPI.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Team member deactivated successfully');
    },
  });
};

// Upload team member photo
export const useUploadTeamPhoto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => 
      teamAPI.uploadPhoto(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team', 'member', variables.id] });
      toast.success('Photo uploaded successfully');
    },
  });
};

// Bulk import team members
export const useBulkImportTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      // Bulk import not implemented yet
      throw new Error('Bulk import functionality not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Team members imported successfully');
    },
  });
};