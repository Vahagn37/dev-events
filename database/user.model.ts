export type UserRole = 'user' | 'admin';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  createdAt: string;
}

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
};
