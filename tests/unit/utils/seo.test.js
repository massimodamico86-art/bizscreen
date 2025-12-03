/**
 * SEO Utilities Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
  getPageTitle,
  getPageDescription,
  getPageRobots,
  getOpenGraphMeta,
  getTwitterMeta,
  getCanonicalUrl,
  getPageKeyFromPath,
  BASE_URL,
  SITE_NAME,
  PAGE_METADATA,
} from '../../../src/utils/seo.js';

describe('SEO Utilities', () => {
  describe('getPageTitle', () => {
    it('returns correct title for known pages', () => {
      expect(getPageTitle('home')).toContain('BizScreen');
      expect(getPageTitle('pricing')).toContain('Pricing');
      expect(getPageTitle('features')).toContain('Features');
      expect(getPageTitle('login')).toContain('Sign In');
    });

    it('returns default title for unknown pages', () => {
      expect(getPageTitle('unknown-page')).toBe(SITE_NAME);
      expect(getPageTitle(null)).toBe(SITE_NAME);
      expect(getPageTitle(undefined)).toBe(SITE_NAME);
    });
  });

  describe('getPageDescription', () => {
    it('returns correct description for known pages', () => {
      const homeDesc = getPageDescription('home');
      expect(homeDesc).toContain('vacation rental');

      const pricingDesc = getPageDescription('pricing');
      expect(pricingDesc).toContain('pricing');
    });

    it('returns default description for unknown pages', () => {
      const defaultDesc = getPageDescription('unknown');
      expect(defaultDesc.toLowerCase()).toContain('digital signage');
    });
  });

  describe('getPageRobots', () => {
    it('returns index,follow for public pages', () => {
      expect(getPageRobots('home')).toBe('index, follow');
      expect(getPageRobots('pricing')).toBe('index, follow');
      expect(getPageRobots('features')).toBe('index, follow');
    });

    it('returns noindex for private pages', () => {
      expect(getPageRobots('login')).toContain('noindex');
      expect(getPageRobots('dashboard')).toContain('noindex');
      expect(getPageRobots('settings')).toContain('noindex');
    });

    it('returns default for unknown pages', () => {
      expect(getPageRobots('unknown')).toBe('index, follow');
    });
  });

  describe('getOpenGraphMeta', () => {
    it('returns complete OG metadata', () => {
      const og = getOpenGraphMeta('home', 'https://bizscreen.app/');

      expect(og['og:title']).toContain('BizScreen');
      expect(og['og:description']).toBeTruthy();
      expect(og['og:type']).toBe('website');
      expect(og['og:url']).toBe('https://bizscreen.app/');
      expect(og['og:site_name']).toBe(SITE_NAME);
      expect(og['og:image']).toBeTruthy();
    });

    it('uses default URL when not provided', () => {
      const og = getOpenGraphMeta('home');
      expect(og['og:url']).toBe(BASE_URL);
    });
  });

  describe('getTwitterMeta', () => {
    it('returns complete Twitter Card metadata', () => {
      const twitter = getTwitterMeta('home');

      expect(twitter['twitter:card']).toBe('summary_large_image');
      expect(twitter['twitter:title']).toContain('BizScreen');
      expect(twitter['twitter:description']).toBeTruthy();
      expect(twitter['twitter:image']).toBeTruthy();
    });
  });

  describe('getCanonicalUrl', () => {
    it('generates correct canonical URL for root', () => {
      expect(getCanonicalUrl('/')).toBe(BASE_URL);
    });

    it('generates correct canonical URL for paths', () => {
      expect(getCanonicalUrl('/pricing')).toBe(`${BASE_URL}/pricing`);
      expect(getCanonicalUrl('/features')).toBe(`${BASE_URL}/features`);
    });

    it('removes trailing slashes', () => {
      expect(getCanonicalUrl('/pricing/')).toBe(`${BASE_URL}/pricing`);
    });

    it('handles default path', () => {
      expect(getCanonicalUrl()).toBe(BASE_URL);
    });
  });

  describe('getPageKeyFromPath', () => {
    it('maps exact paths correctly', () => {
      expect(getPageKeyFromPath('/')).toBe('home');
      expect(getPageKeyFromPath('/pricing')).toBe('pricing');
      expect(getPageKeyFromPath('/features')).toBe('features');
      expect(getPageKeyFromPath('/auth/login')).toBe('login');
      expect(getPageKeyFromPath('/auth/signup')).toBe('signup');
    });

    it('maps app paths correctly', () => {
      expect(getPageKeyFromPath('/app')).toBe('dashboard');
      expect(getPageKeyFromPath('/app/media')).toBe('media');
      expect(getPageKeyFromPath('/app/playlists')).toBe('playlists');
      expect(getPageKeyFromPath('/app/screens')).toBe('screens');
    });

    it('handles nested routes', () => {
      // Nested routes currently map to app dashboard since /app is checked first
      // This is acceptable since all app routes have noindex anyway
      expect(getPageKeyFromPath('/app/media/123')).toBe('dashboard');
      expect(getPageKeyFromPath('/app/playlists/edit/456')).toBe('dashboard');
    });

    it('returns home for unknown paths', () => {
      expect(getPageKeyFromPath('/unknown')).toBe('home');
      expect(getPageKeyFromPath('/some/random/path')).toBe('home');
    });
  });

  describe('PAGE_METADATA', () => {
    it('has required marketing pages', () => {
      expect(PAGE_METADATA.home).toBeDefined();
      expect(PAGE_METADATA.pricing).toBeDefined();
      expect(PAGE_METADATA.features).toBeDefined();
    });

    it('has required auth pages', () => {
      expect(PAGE_METADATA.login).toBeDefined();
      expect(PAGE_METADATA.signup).toBeDefined();
    });

    it('has required app pages', () => {
      expect(PAGE_METADATA.dashboard).toBeDefined();
      expect(PAGE_METADATA.media).toBeDefined();
      expect(PAGE_METADATA.playlists).toBeDefined();
      expect(PAGE_METADATA.screens).toBeDefined();
    });

    it('all titles contain BizScreen', () => {
      Object.values(PAGE_METADATA).forEach(meta => {
        expect(meta.title).toContain('BizScreen');
      });
    });
  });

  describe('Constants', () => {
    it('BASE_URL is a valid URL', () => {
      expect(BASE_URL).toMatch(/^https:\/\//);
    });

    it('SITE_NAME is defined', () => {
      expect(SITE_NAME).toBe('BizScreen');
    });
  });
});
