export interface Member {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: string | null;
  comments: Comment[];
  listId: string;
  order: number;
}

export interface TaskList {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  title: string;
  lists: TaskList[];
  members: Member[];
}
