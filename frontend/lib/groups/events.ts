/**
 * Group events API: fetch events, create event, respond (going / not going).
 */

import { GROUPS_API_URL } from "./config";
import type {
  GroupEventsResponse,
  CreateEventRequest,
  EventVoter,
} from "./interface";

export async function fetchEventVoters(
  eventId: number
): Promise<{ success: boolean; voters?: EventVoter[] }> {
  try {
    const response = await fetch(
      `${GROUPS_API_URL}/events/responses?event_id=${eventId}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching event voters:", error);
    return { success: false };
  }
}

export async function fetchGroupEvents(
  groupId: number
): Promise<GroupEventsResponse | null> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/${groupId}/events`, {
      credentials: "include",
    });

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error("Error fetching group events:", error);
    return null;
  }
}

export async function createGroupEvent(
  request: CreateEventRequest
): Promise<{ success: boolean; message?: string; eventId?: number }> {
  try {
    const formData = new FormData();
    formData.append("group_id", request.groupId.toString());
    formData.append("title", request.title);
    formData.append("description", request.description);
    formData.append("event_date", request.date);
    formData.append("event_time", request.time);

    if (request.imageFile) {
      formData.append("coverImage", request.imageFile);
    }

    const response = await fetch(`${GROUPS_API_URL}/events`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating group event:", error);
    return {
      success: false,
      message: "Failed to create event",
    };
  }
}

export async function respondToEvent(
  eventId: number,
  response: "going" | "not-going"
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${GROUPS_API_URL}/events/respond`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_id: eventId, response }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error responding to event:", error);
    return { success: false, message: "Failed to record response" };
  }
}


