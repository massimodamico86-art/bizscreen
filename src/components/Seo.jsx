/**
 * SEO Component
 *
 * Manages document head metadata for SEO and social sharing.
 * Uses direct DOM manipulation (no external dependency needed).
 *
 * Usage:
 *   <Seo pageKey="home" />
 *   // or with overrides:
 *   <Seo pageKey="pricing" title="Custom Title" description="Custom desc" />
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getPageTitle,
  getPageDescription,
  getPageRobots,
  getOpenGraphMeta,
  getTwitterMeta,
  getCanonicalUrl,
  getPageKeyFromPath,
  BASE_URL,
} from '../utils/seo';

/**
 * Set or update a meta tag in the document head
 * @param {string} name - Meta tag name or property
 * @param {string} content - Meta tag content
 * @param {string} attribute - 'name' or 'property'
 */
function setMetaTag(name, content, attribute = 'name') {
  if (!content) return;

  let element = document.querySelector(`meta[${attribute}="${name}"]`);

  if (element) {
    element.setAttribute('content', content);
  } else {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    element.setAttribute('content', content);
    document.head.appendChild(element);
  }
}

/**
 * Set or update a link tag in the document head
 * @param {string} rel - Link rel attribute
 * @param {string} href - Link href
 */
function setLinkTag(rel, href) {
  if (!href) return;

  let element = document.querySelector(`link[rel="${rel}"]`);

  if (element) {
    element.setAttribute('href', href);
  } else {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    element.setAttribute('href', href);
    document.head.appendChild(element);
  }
}

/**
 * SEO Component
 * @param {object} props
 * @param {string} props.pageKey - Key for metadata lookup (optional, auto-detected from path)
 * @param {string} props.title - Override title
 * @param {string} props.description - Override description
 * @param {string} props.robots - Override robots directive
 * @param {string} props.ogImage - Override OG image
 * @param {string} props.canonicalPath - Override canonical path
 */
export default function Seo({
  pageKey,
  title,
  description,
  robots,
  ogImage,
  canonicalPath,
}) {
  const location = useLocation();

  useEffect(() => {
    // Determine page key from prop or path
    const key = pageKey || getPageKeyFromPath(location.pathname);

    // Get metadata (with overrides)
    const finalTitle = title || getPageTitle(key);
    const finalDescription = description || getPageDescription(key);
    const finalRobots = robots || getPageRobots(key);
    const currentUrl = `${BASE_URL}${location.pathname}`;
    const canonicalUrl = getCanonicalUrl(canonicalPath || location.pathname);

    // Set document title
    document.title = finalTitle;

    // Set basic meta tags
    setMetaTag('description', finalDescription);
    setMetaTag('robots', finalRobots);

    // Set canonical link
    setLinkTag('canonical', canonicalUrl);

    // Set Open Graph tags
    const ogMeta = getOpenGraphMeta(key, currentUrl);
    if (ogImage) ogMeta['og:image'] = ogImage;
    for (const [property, content] of Object.entries(ogMeta)) {
      setMetaTag(property, content, 'property');
    }

    // Set Twitter Card tags
    const twitterMeta = getTwitterMeta(key);
    if (ogImage) twitterMeta['twitter:image'] = ogImage;
    for (const [name, content] of Object.entries(twitterMeta)) {
      setMetaTag(name, content, 'name');
    }
  }, [pageKey, title, description, robots, ogImage, canonicalPath, location.pathname]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook version for use in components that don't render Seo
 * @param {object} options - Same as Seo props
 */
export function useSeo(options = {}) {
  const location = useLocation();

  useEffect(() => {
    const {
      pageKey,
      title,
      description,
      robots,
      ogImage,
      canonicalPath,
    } = options;

    const key = pageKey || getPageKeyFromPath(location.pathname);
    const finalTitle = title || getPageTitle(key);
    const finalDescription = description || getPageDescription(key);
    const finalRobots = robots || getPageRobots(key);
    const currentUrl = `${BASE_URL}${location.pathname}`;
    const canonicalUrl = getCanonicalUrl(canonicalPath || location.pathname);

    document.title = finalTitle;
    setMetaTag('description', finalDescription);
    setMetaTag('robots', finalRobots);
    setLinkTag('canonical', canonicalUrl);

    const ogMeta = getOpenGraphMeta(key, currentUrl);
    if (ogImage) ogMeta['og:image'] = ogImage;
    for (const [property, content] of Object.entries(ogMeta)) {
      setMetaTag(property, content, 'property');
    }

    const twitterMeta = getTwitterMeta(key);
    if (ogImage) twitterMeta['twitter:image'] = ogImage;
    for (const [name, content] of Object.entries(twitterMeta)) {
      setMetaTag(name, content, 'name');
    }
  }, [options, location.pathname]);
}
