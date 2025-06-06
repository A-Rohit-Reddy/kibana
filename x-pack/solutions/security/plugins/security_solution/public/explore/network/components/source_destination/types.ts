/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SourceDestinationType = 'source' | 'destination';

export interface GeoFieldsProps {
  contextId: string;
  scopeId: string;
  destinationGeoContinentName?: string[] | null;
  destinationGeoCountryName?: string[] | null;
  destinationGeoCountryIsoCode?: string[] | null;
  destinationGeoRegionName?: string[] | null;
  destinationGeoCityName?: string[] | null;
  eventId: string;
  sourceGeoContinentName?: string[] | null;
  sourceGeoCountryName?: string[] | null;
  sourceGeoCountryIsoCode?: string[] | null;
  sourceGeoRegionName?: string[] | null;
  sourceGeoCityName?: string[] | null;
  type: SourceDestinationType;
}

export interface SourceDestinationProps {
  contextId: string;
  scopeId: string;
  destinationBytes?: string[] | null;
  destinationGeoContinentName?: string[] | null;
  destinationGeoCountryName?: string[] | null;
  destinationGeoCountryIsoCode?: string[] | null;
  destinationGeoRegionName?: string[] | null;
  destinationGeoCityName?: string[] | null;
  destinationIp?: string[] | null;
  destinationPackets?: string[] | null;
  networkProtocol?: string[] | null;
  destinationPort?: string[] | null;
  direction?: string[] | null;
  eventId: string;
  networkBytes?: string[] | null;
  networkCommunityId?: string[] | null;
  networkDirection?: string[] | null;
  networkPackets?: string[] | null;
  sourceBytes?: string[] | null;
  sourceGeoContinentName?: string[] | null;
  sourceGeoCountryName?: string[] | null;
  sourceGeoCountryIsoCode?: string[] | null;
  sourceGeoRegionName?: string[] | null;
  sourceGeoCityName?: string[] | null;
  sourceIp?: string[] | null;
  sourcePackets?: string[] | null;
  sourcePort?: string[] | null;
  transport?: string[] | null;
}

export interface SourceDestinationIpProps {
  contextId: string;
  scopeId: string;
  destinationGeoContinentName?: string[] | null;
  destinationGeoCountryName?: string[] | null;
  destinationGeoCountryIsoCode?: string[] | null;
  destinationGeoRegionName?: string[] | null;
  destinationGeoCityName?: string[] | null;
  destinationIp?: string[] | null;
  destinationPort?: Array<number | string | null> | null;
  eventId: string;
  sourceGeoContinentName?: string[] | null;
  sourceGeoCountryName?: string[] | null;
  sourceGeoCountryIsoCode?: string[] | null;
  sourceGeoRegionName?: string[] | null;
  sourceGeoCityName?: string[] | null;
  sourceIp?: string[] | null;
  sourcePort?: Array<number | string | null> | null;
  type: SourceDestinationType;
}

export interface SourceDestinationWithArrowsProps {
  contextId: string;
  scopeId: string;
  destinationBytes?: string[] | null;
  destinationGeoContinentName?: string[] | null;
  destinationGeoCountryName?: string[] | null;
  destinationGeoCountryIsoCode?: string[] | null;
  destinationGeoRegionName?: string[] | null;
  destinationGeoCityName?: string[] | null;
  destinationIp?: string[] | null;
  destinationPackets?: string[] | null;
  destinationPort?: string[] | null;
  eventId: string;
  sourceBytes?: string[] | null;
  sourceGeoContinentName?: string[] | null;
  sourceGeoCountryName?: string[] | null;
  sourceGeoCountryIsoCode?: string[] | null;
  sourceGeoRegionName?: string[] | null;
  sourceGeoCityName?: string[] | null;
  sourceIp?: string[] | null;
  sourcePackets?: string[] | null;
  sourcePort?: string[] | null;
}
