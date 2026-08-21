/**
 * Geographic classification utilities
 * Handles region-based priorities and geographic scope calculations
 */

import { GEOGRAPHIC_PRIORITY_WEIGHTS } from "./config";

export type GeographicScope = "LOCAL" | "REGIONAL" | "STATE" | "NATIONAL" | "INTERNATIONAL";

export interface GeographicInfo {
  regionId?: string;
  district?: string;
  state?: string;
  country?: string;
  scope: GeographicScope;
  priority: number;
}

/**
 * Determine geographic scope based on location data
 */
export function determineGeographicScope(
  regionType?: string,
  district?: string,
  state?: string,
  country?: string
): GeographicScope {
  // Alipurduar towns are LOCAL
  if (regionType === "TOWN" && district === "Alipurduar") {
    return "LOCAL";
  }
  
  // Alipurduar division is REGIONAL
  if (district === "Alipurduar" || regionType === "DIVISION") {
    return "REGIONAL";
  }
  
  // North Bengal districts are REGIONAL
  const northBengalDistricts = [
    "Cooch Behar", "Jalpaiguri", "Darjeeling", "Kalimpong", 
    "Uttar Dinajpur", "Dakshin Dinajpur", "Malda"
  ];
  if (district && northBengalDistricts.includes(district)) {
    return "REGIONAL";
  }
  
  // West Bengal is STATE
  if (state === "West Bengal") {
    return "STATE";
  }
  
  // India is NATIONAL
  if (country === "India") {
    return "NATIONAL";
  }
  
  // Everything else is INTERNATIONAL
  return "INTERNATIONAL";
}

/**
 * Calculate geographic priority score
 */
export function calculateGeographicPriority(
  scope: GeographicScope,
  basePriority: number = 0
): number {
  const weight = GEOGRAPHIC_PRIORITY_WEIGHTS[scope] || 0.5;
  return Math.round(basePriority + (weight * 3));
}

/**
 * Get geographic weight for scoring
 */
export function getGeographicWeight(scope: GeographicScope): number {
  return GEOGRAPHIC_PRIORITY_WEIGHTS[scope] || 0.5;
}

/**
 * Check if a location is within Alipurduar region
 */
export function isAlipurduarRegion(district?: string, regionType?: string): boolean {
  return district === "Alipurduar" || regionType === "TOWN";
}

/**
 * Check if a location is within North Bengal
 */
export function isNorthBengal(district?: string): boolean {
  const northBengalDistricts = [
    "Alipurduar", "Cooch Behar", "Jalpaiguri", "Darjeeling", "Kalimpong",
    "Uttar Dinajpur", "Dakshin Dinajpur", "Malda"
  ];
  return district ? northBengalDistricts.includes(district) : false;
}

/**
 * Format geographic display string
 */
export function formatGeographicDisplay(info: GeographicInfo): string {
  const parts: string[] = [];
  
  if (info.district) parts.push(info.district);
  if (info.state && info.state !== info.district) parts.push(info.state);
  if (info.country && info.country !== "India") parts.push(info.country);
  
  return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}

/**
 * Validate geographic data consistency
 */
export function validateGeographicConsistency(
  district?: string,
  state?: string,
  country?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (state === "West Bengal" && district) {
    const validDistricts = [
      "Alipurduar", "Cooch Behar", "Jalpaiguri", "Darjeeling", "Kalimpong",
      "Uttar Dinajpur", "Dakshin Dinajpur", "Malda", "Kolkata", 
      "Howrah", "Hooghly", "Nadia", "North 24 Parganas", "South 24 Parganas"
      // Add more WB districts as needed
    ];
    if (!validDistricts.includes(district)) {
      errors.push(`District "${district}" is not in West Bengal`);
    }
  }
  
  if (country === "India" && state && !state.endsWith("India")) {
    // Basic validation - can be enhanced with state list
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get region priority for homepage ranking
 * Alipurduar stories get highest priority, then North Bengal, etc.
 */
export function getHomepageRegionPriority(
  district?: string,
  scope?: GeographicScope
): number {
  if (isAlipurduarRegion(district)) return 100;
  if (isNorthBengal(district)) return 80;
  if (scope === "STATE") return 60;
  if (scope === "NATIONAL") return 40;
  if (scope === "INTERNATIONAL") return 20;
  return 50; // Default for unspecified
}