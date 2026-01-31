// User/Author interface
export interface User {
  ID: number;
  Email: string;
  FirstName: string;
  LastName: string;
  Nickname: string;
  Avatar: string;
  AboutMe: string;
  IsPublic: boolean;
  CreatedAt: string;
  DateOfBirth?: string;
}

// Group interface
export interface Group {
  id: number;
  name: string;
  description: string;
  cover_image_path: string;
  owner_id: number;
  created_at: string;
  members_count?: number;
  is_member?: boolean;
  is_owner?: boolean;
  has_pending_request?: boolean;
  posts?: GroupPost[];
  events?: GroupEvent[];
}

// Group Member interface
export interface GroupMember {
  ID: number;
  FirstName: string;
  LastName: string;
  Avatar: string;
  Role: "owner" | "member";
  JoinedAt: string;
}

// Group Post interface
export interface GroupPost {
  id: number;
  group_id?: number;
  content: string;
  image_path?: string;
  user_id: number;
  author?: {
    ID: number;
    Email: string;
    FirstName: string;
    LastName: string;
    Nickname: string;
    Avatar: string;
    AboutMe: string;
    IsPublic: boolean;
    CreatedAt: string;
  };
  created_at: string;
  location?: string;
  likes?: number;
  comments?: number;
  is_liked?: boolean;
}

// Comment interface (for future use)
export interface PostComment {
  id: number;
  post_id: number;
  author_id: number;
  author?: User;
  content: string;
  created_at: string;
  updated_at?: string;
  likes: number;
  is_liked: boolean;
}

// Group Event interface
export interface GroupEvent {
  id: number;
  group_id: number;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  image_path?: string;
  creator_id?: number;
  creator?: {
    userId: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  going_count?: number;
  not_going_count?: number;
  user_response?: "going" | "not-going" | null;
  created_at: string;
}

export interface EventVoter {
  userId: number;
  firstName: string;
  lastName: string;
  avatar: string;
  response: "going" | "not-going";
}

// Group Invitation interface
export interface GroupInvitation {
  ID: number;
  GroupID: number;
  GroupName: string;
  InviterID: number;
  InviterName: string;
  InvitedUserID: number;
  Status: "pending" | "accepted" | "declined";
  CreatedAt: string;
}

// Group Join Request interface
export interface GroupJoinRequest {
  id: number;
  group_id: number;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user?: {
    userId: number;
    firstName: string;
    lastName: string;
    avatar?: string;
    nickname?: string;
  };
}

// API Response interfaces
export interface GroupsResponse {
  success: boolean;
  userGroups: Group[];
  allGroups: Group[];
}

export interface CreateGroupResponse {
  success: boolean;
  message?: string;
  groupId?: number;
}

export interface GroupDetailResponse {
  success: boolean;
  group: {
    id: number;
    name: string;
    description: string;
    cover_image_path: string;
    owner_id: number;
    created_at: string;
    members_count: number;
    is_member: boolean;
    is_owner: boolean;
    owner?: {
      userId: number;
      email: string;
      firstName: string;
      lastName: string;
      nickname?: string;
      avatar?: string;
      aboutMe?: string;
      createdAt: string;
    };
    posts?: GroupPost[];
    events?: GroupEvent[];
  };
}

export interface GroupPostsResponse {
  success: boolean;
  posts: GroupPost[];
}

export interface GroupEventsResponse {
  success: boolean;
  events: GroupEvent[];
}

// API Request interfaces
export interface CreateEventRequest {
  groupId: number;
  title: string;
  description: string;
  date: string;
  time: string;
  imagePath?: string;
  imageFile?: File;
}

export interface InviteUsersRequest {
  groupId: number;
  userIds: number[];
}

export interface JoinRequestRequest {
  groupId: number;
}

export interface LikePostResponse {
  success: boolean;
  message?: string;
  likes?: number;
  is_liked?: boolean;
}

export interface CommentResponse {
  success: boolean;
  message?: string;
  comment?: any;
}

export interface ShareResponse {
  success: boolean;
  message?: string;
}

export interface GroupChatMessage {
  id: number;
  group_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user?: {
    ID: number;
    FirstName: string;
    LastName: string;
    Avatar: string;
    Nickname: string;
  };
}

export interface GroupChatHistoryResponse {
  success: boolean;
  messages: GroupChatMessage[];
}