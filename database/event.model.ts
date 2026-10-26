export type EventStatus = 'pending' | 'confirmed' | 'rejected';

export interface IEvent {
  _id: string;
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  userId?: string;
  status?: EventStatus;
  createdAt: string;
  updatedAt: string;
}
