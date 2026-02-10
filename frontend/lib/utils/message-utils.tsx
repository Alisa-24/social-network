/**
 * Utility functions for processing chat messages
 */

// Extract image URLs from message content
export const extractImageUrls = (text: string): { url: string; isImage: boolean }[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
  
  return urls.map(url => ({
    url,
    isImage: imageExtensions.test(url) || url.includes('tenor.com') || url.includes('giphy.com')
  }));
};

// Render message content with clickable links (excludes image URLs)
export const renderMessageContent = (content: string, imageUrls: { url: string; isImage: boolean }[]) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Get list of image URLs to exclude from text rendering
  const imageUrlStrings = imageUrls
    .filter(item => item.isImage)
    .map(item => item.url);
  
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      // Skip rendering if this URL is an image (it will be shown as an image below)
      if (imageUrlStrings.includes(part)) {
        return null;
      }
      
      // Render non-image URLs as clickable links
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:text-primary-foreground break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  }).filter(Boolean); // Remove null entries
};
