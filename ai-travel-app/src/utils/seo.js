import { useEffect } from 'react';

export const useSEO = ({ title, description, image, keywords = [] }) => {
  useEffect(() => {
    if (title) {
      document.title = `${title} | TRAVEX - AI Travel Planning`;
    }

    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;
    }

    if (keywords.length > 0) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords.join(', ');
    }
  }, [title, description, keywords, image]);
};