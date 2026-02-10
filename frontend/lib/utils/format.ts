export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return "Just now";
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return "1 week ago";
    if (weeks < 4) return `${weeks} weeks ago`;
    return date.toLocaleDateString();
  } catch (error) {
    return "Recently";
  }
}


export function formatDate(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }
): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", options);
  } catch (error) {
    return "Unknown date";
  }
}


export function formatTime(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (error) {
    return "Unknown time";
  }
}
