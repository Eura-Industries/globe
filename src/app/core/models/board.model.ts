export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: CollaboratorRole;
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  collaborators: Collaborator[];
  pendingInvites: string[]; // emails
  background: 'dots' | 'grid' | 'lines' | 'blank';
  createdAt: number;
  updatedAt: number;
  emoji?: string; // dashboard thumbnail
}
