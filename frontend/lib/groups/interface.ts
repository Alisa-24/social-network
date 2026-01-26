export interface Group {
  ID: number;
  Name: string;
  Description: string;
  CoverImagePath: string;
  OwnerID: number;
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
}
