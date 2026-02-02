import { useEffect } from 'react';

/**
 * Hook to set meta tags for SEO and accessibility
 */
export const useSEO = ({ title, description, image, keywords = [] }) => {
  useEffect(() => {
    // Title
    if (title) {
      document.title = `${title} | TRAVEX - AI Travel Planning`;
    }

    // Meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;
    }

    // Keywords
    if (keywords.length > 0) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords.join(', ');
    }

    // Open Graph
    if (image) {
      let metaOg = document.querySelector('meta[property="og:image"]');
      if (!metaOg) {
        metaOg = document.createElement('meta');
        metaOg.property = 'og:image';
        document.head.appendChild(metaOg);
      }
      metaOg.content = image;
    }

    return () => {
      // Cleanup is optional for meta tags
    };
  }, [title, description, image, keywords]);
};

/**
 * Skip to main content link for accessibility
 */
export const SkipToMainContent = () => (
  <a
    href="#main-content"
    className="absolute top-0 left-0 -translate-y-full focus:translate-y-0 bg-blue-600 text-white px-4 py-2 rounded-b-lg font-semibold z-50 transition-transform"
  >
    Skip to main content
  </a>
);
