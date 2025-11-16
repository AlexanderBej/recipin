export type MinimalUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
};

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: Date;
  onboardingCompleted: boolean;
}
