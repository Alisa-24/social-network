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
  posts?: GroupPost[];
  events?: GroupEvent[];
}

export interface GroupMember {
  ID: number;
  FirstName: string;
  LastName: string;
  Avatar: string;
  Role: "owner" | "member";
  JoinedAt: string;
}

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

export interface GroupEvent {
  id: number;
  group_id: number;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  image_path?: string;
  creator_id?: number;
  going_count?: number;
  not_going_count?: number;
  user_response?: "going" | "not-going" | null;
  created_at: string;
}

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

export interface GroupJoinRequest {
  ID: number;
  GroupID: number;
  UserID: number;
  UserName: string;
  Status: "pending" | "accepted" | "declined";
  CreatedAt: string;
}

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

export interface CreateEventRequest {
  groupId: number;
  title: string;
  description: string;
  date: string;
  time: string;
  imagePath?: string;
}

export interface InviteUsersRequest {
  groupId: number;
  userIds: number[];
}

export interface JoinRequestRequest {
  groupId: number;
}
