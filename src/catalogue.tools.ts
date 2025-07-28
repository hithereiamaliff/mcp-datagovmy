import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
import { 
  CATALOGUE_INDEX as catalogueIndex, 
  CATALOGUE_FILTERS as catalogueFilters,
  DatasetMetadata,
  SiteCategory
} from '../scripts/catalogue-index.js';

// API Base URL for Malaysia Open Data API
const API_BASE_URL = 'https://api.data.gov.my';

// Helper functions for searching and filtering the catalogue
const getDatasetById = (id: string): DatasetMetadata | undefined => {
  return catalogueIndex.find(d => d.id === id);
};

const searchDatasets = (query: string): DatasetMetadata[] => {
  const lowerCaseQuery = query.toLowerCase();
  return catalogueIndex.filter(d => 
    d.title_en.toLowerCase().includes(lowerCaseQuery) ||
    d.title_ms.toLowerCase().includes(lowerCaseQuery) ||
    d.description_en.toLowerCase().includes(lowerCaseQuery) ||
    d.description_ms.toLowerCase().includes(lowerCaseQuery)
  );
};

const filterDatasets = (filters: any): DatasetMetadata[] => {
  return catalogueIndex.filter(d => {
    if (filters.frequency && d.frequency !== filters.frequency) return false;
    if (filters.geography && !filters.geography.every((g: string) => d.geography.includes(g))) return false;
    if (filters.demography && !filters.demography.every((dem: string) => d.demography.includes(dem))) return false;
    if (filters.dataSource && !filters.dataSource.every((ds: string) => d.data_source.includes(ds))) return false;
    return true;
  });
};

// Data Catalogue endpoints - correct endpoint for Malaysia Open Data API
const OPENDOSM_ENDPOINT = '/opendosm';

// Legacy list of known dataset IDs (keeping for backward compatibility)
const KNOWN_DATASETS = [
  { id: 'air_pollution', description: 'Monthly Air Pollution' },
  { id: 'arc_dosm', description: 'DOSM\'s Advance Release Calendar' },
  { id: 'arrivals', description: 'Monthly Arrivals by Nationality & Sex' },
  { id: 'arrivals_soe', description: 'Monthly Arrivals by State of Entry, Nationality & Sex' },
  { id: 'births', description: 'Daily Live Births' },
  { id: 'births_annual', description: 'Annual Live Births' },
  { id: 'births_annual_sex_ethnic', description: 'Annual Live Births by Sex & Ethnicity' },
  { id: 'births_annual_sex_ethnic_state', description: 'Annual Live Births by State, Sex, & Ethnicity' },
  { id: 'births_annual_state', description: 'Annual Live Births by State' },
  { id: 'births_district_sex', description: 'Annual Live Births by District & Sex' },
  { id: 'blood_donations', description: 'Daily Blood Donations by Blood Group' },
  { id: 'blood_donations_state', description: 'Daily Blood Donations by Blood Group & State' },
  { id: 'bop_balance', description: 'Balance of Key BOP Components' },
  { id: 'cellular_subscribers', description: 'Cellular Subscribers by Plan Type' },
  { id: 'completion_school_state', description: 'School Completion Rates by State' },
  { id: 'cosmetic_notifications', description: 'Notified Cosmetic Products' },
  { id: 'cosmetic_notifications_cancelled', description: 'Cancelled Cosmetic Product Notifications' },
  { id: 'cosmetics_manufacturers', description: 'Approved Manufacturers of Cosmetic Products' },
  { id: 'covid_cases', description: 'Daily COVID-19 Cases by State' },
  { id: 'covid_cases_age', description: 'Daily COVID-19 Cases by Age Group & State' },
  { id: 'covid_cases_vaxstatus', description: 'Daily COVID-19 Cases by Vaccination Status & State' },
  { id: 'covid_deaths_linelist', description: 'Transactional Records: Deaths due to COVID-19' },
  { id: 'cpi_3d', description: 'Monthly CPI by Group (3-digit)' },
  { id: 'cpi_4d', description: 'Monthly CPI by Class (4-digit)' },
  { id: 'cpi_5d', description: 'Monthly CPI by Subclass (5-digit)' },
  { id: 'cpi_annual', description: 'Annual CPI by Division (2-digit)' },
  { id: 'cpi_annual_inflation', description: 'Annual CPI Inflation by Division (2-digit)' },
  { id: 'cpi_core', description: 'Monthly Core CPI by Division (2-digit)' },
  { id: 'cpi_core_inflation', description: 'Monthly Core CPI Inflation by Division (2-digit)' },
  { id: 'cpi_headline', description: 'Monthly CPI by Division (2-digit)' },
  { id: 'cpi_headline_inflation', description: 'Monthly CPI Inflation by Division (2-digit)' },
  { id: 'cpi_lowincome', description: 'Monthly CPI for Low-Income Households' },
  { id: 'cpi_state', description: 'Monthly CPI by State & Division (2-digit)' },
  { id: 'cpi_state_inflation', description: 'Monthly CPI Inflation by State & Division (2-digit)' },
  { id: 'cpi_strata', description: 'Monthly CPI by Strata & Division (2-digit)' },
  { id: 'crime_district', description: 'Crimes by District & Crime Type' },
  { id: 'crops_district_area', description: 'Crop Area by District' },
  { id: 'crops_district_production', description: 'Crop Production by District' },
  { id: 'crops_state', description: 'Crop Area and Production by State' },
  { id: 'currency_in_circulation', description: 'Monthly Currency in Circulation' },
  { id: 'currency_in_circulation_annual', description: 'Annual Currency in Circulation' },
  { id: 'deaths', description: 'Annual Deaths' },
  { id: 'deaths_district_sex', description: 'Annual Deaths by District & Sex' },
  { id: 'deaths_early_childhood', description: 'Annual Early Childhood Deaths' },
  { id: 'deaths_early_childhood_sex', description: 'Annual Early Childhood Deaths by Sex' },
  { id: 'deaths_early_childhood_state', description: 'Annual Early Childhood Deaths by State' },
  { id: 'deaths_early_childhood_state_sex', description: 'Annual Early Childhood Deaths by State & Sex' },
  { id: 'deaths_maternal', description: 'Annual Maternal Deaths' },
  { id: 'deaths_maternal_state', description: 'Annual Maternal Deaths by State' },
  { id: 'deaths_sex_ethnic', description: 'Annual Deaths by Sex & Ethnicity' },
  { id: 'deaths_sex_ethnic_state', description: 'Annual Deaths by State, Sex, & Ethnicity' },
  { id: 'deaths_state', description: 'Annual Deaths by State' },
  { id: 'domains', description: 'Number of Registered .MY Domains' },
  { id: 'domains_dnssec', description: 'Number of Registered .MY Domains with DNSSEC' },
  { id: 'domains_idn', description: 'Number of Registered Internationalised .MY Domains' },
  { id: 'domains_ipv6', description: 'Number of Registered .MY Domains with IPv6 DNS' },
  { id: 'economic_indicators', description: 'Malaysian Economic Indicators' },
  { id: 'electricity_access', description: 'Households with Access to Electricity' },
  { id: 'electricity_consumption', description: 'Monthly Electricity Consumption' },
  { id: 'electricity_supply', description: 'Electricity Supply' },
  { id: 'employment_sector', description: 'Employment by MSIC Sector and Sex' },
  { id: 'enrolment_school_district', description: 'Enrolment in Government Schools by District' },
  { id: 'exchangerates', description: 'Exchange Rates' },
  { id: 'fdi_flows', description: 'Foreign Direct Investment (FDI) Flows' },
  { id: 'federal_budget_moe', description: 'Annual Budget Allocation for the Ministry of Education' },
  { id: 'federal_budget_moh', description: 'Annual Budget Allocation for the Ministry of Health' },
  { id: 'federal_finance_qtr', description: 'Quarterly Federal Government Finance' },
  { id: 'federal_finance_qtr_de', description: 'Quarterly Federal Government Development Expenditure by Function' },
  { id: 'federal_finance_qtr_oe', description: 'Quarterly Federal Government Operating Expenditure by Object' },
  { id: 'federal_finance_qtr_revenue', description: 'Quarterly Federal Government Revenue' },
  { id: 'federal_finance_year', description: 'Annual Federal Government Finance' },
  { id: 'federal_finance_year_de', description: 'Annual Federal Government Development Expenditure by Function' },
  { id: 'federal_finance_year_oe', description: 'Annual Federal Government Operating Expenditure by Object' },
  { id: 'federal_finance_year_revenue', description: 'Annual Federal Government Revenue' },
  { id: 'fertility', description: 'TFR and ASFR' },
  { id: 'fertility_state', description: 'TFR and ASFR by State' },
  { id: 'fish_landings', description: 'Monthly Landings of Marine Fish by State' },
  { id: 'forest_reserve', description: 'Area of Permanent Forest Reserves' },
  { id: 'forest_reserve_state', description: 'Area of Permanent Forest Reserves by State' },
  { id: 'fuelprice', description: 'Price of Petroleum & Diesel' },
  { id: 'gdp_annual_nominal_demand', description: 'Annual Nominal GDP by Expenditure Type' },
  { id: 'gdp_annual_nominal_demand_granular', description: 'Annual Nominal GDP by Expenditure Subtype' },
  { id: 'gdp_annual_nominal_income', description: 'Annual Nominal GDP by Income Component' },
  { id: 'gdp_annual_nominal_supply', description: 'Annual Nominal GDP by Economic Sector' },
  { id: 'gdp_annual_nominal_supply_granular', description: 'Annual Nominal GDP by Economic Subsector' },
  { id: 'gdp_annual_real_demand', description: 'Annual Real GDP by Expenditure Type' },
  { id: 'gdp_annual_real_demand_granular', description: 'Annual Real GDP by Expenditure Subtype' },
  { id: 'gdp_annual_real_supply', description: 'Annual Real GDP by Economic Sector' },
  { id: 'gdp_annual_real_supply_granular', description: 'Annual Real GDP by Economic Subsector' },
  { id: 'gdp_district_real_supply', description: 'Annual Real GDP by District & Economic Sector' },
  { id: 'gdp_gni_annual_nominal', description: 'Annual Nominal GDP & GNI: 1947 to Present' },
  { id: 'gdp_gni_annual_real', description: 'Annual Real GDP & GNI: 1970 to Present' },
  { id: 'gdp_lookup', description: 'Lookup Table: GDP' },
  { id: 'gdp_qtr_nominal', description: 'Quarterly Nominal GDP' },
  { id: 'gdp_qtr_nominal_demand', description: 'Quarterly Nominal GDP by Expenditure Type' },
  { id: 'gdp_qtr_nominal_demand_granular', description: 'Quarterly Nominal GDP by Expenditure Subtype' },
  { id: 'gdp_qtr_nominal_supply', description: 'Quarterly Nominal GDP by Economic Sector' },
  { id: 'gdp_qtr_nominal_supply_granular', description: 'Quarterly Nominal GDP by Economic Subsector' },
  { id: 'gdp_qtr_real', description: 'Quarterly Real GDP' },
  { id: 'gdp_qtr_real_demand', description: 'Quarterly Real GDP by Expenditure Type' },
  { id: 'gdp_qtr_real_demand_granular', description: 'Quarterly Real GDP by Expenditure Subtype' },
  { id: 'gdp_qtr_real_sa', description: 'Quarterly Real GDP (Seasonally Adjusted)' },
  { id: 'gdp_qtr_real_sa_demand', description: 'Quarterly Real GDP (Seasonally Adjusted) by Expenditure Type' },
  { id: 'gdp_qtr_real_sa_supply', description: 'Quarterly Real GDP (Seasonally Adjusted) by Economic Sector' },
  { id: 'gdp_qtr_real_supply', description: 'Quarterly Real GDP by Economic Sector' },
  { id: 'gdp_qtr_real_supply_granular', description: 'Quarterly Real GDP by Economic Subsector' },
  { id: 'gdp_state_real_supply', description: 'Annual Real GDP by State & Economic Sector' },
  { id: 'ghg_emissions', description: 'Greenhouse Gas Emissions' },
  { id: 'healthcare_staff', description: 'Healthcare Staff by State and Staff Type' },
  { id: 'hh_access_amenities', description: 'Access to Basic Amenities by State & District' },
  { id: 'hh_income', description: 'Household Income' },
  { id: 'hh_income_district', description: 'Household Income by Administrative District' },
  { id: 'hh_income_state', description: 'Household Income by State' },
  { id: 'hh_inequality', description: 'Income Inequality' },
  { id: 'hh_inequality_district', description: 'Income Inequality by District' },
  { id: 'hh_inequality_state', description: 'Income Inequality by State' },
  { id: 'hh_poverty', description: 'Poverty' },
  { id: 'hh_poverty_district', description: 'Poverty by Administrative District' },
  { id: 'hh_poverty_state', description: 'Poverty by State' },
  { id: 'hh_profile', description: 'Number of Households and Living Quarters' },
  { id: 'hh_profile_state', description: 'Number of Households and Living Quarters by State' },
  { id: 'hies_district', description: 'Household Income and Expenditure: Administrative Districts' },
  { id: 'hies_malaysia_percentile', description: 'Household Income by Percentile' },
  { id: 'hies_state', description: 'Household Income and Expenditure: States' },
  { id: 'hies_state_percentile', description: 'Household Income by State & Percentile' },
  { id: 'hospital_beds', description: 'Hospital Beds by State and Hospital Type' },
  { id: 'infant_immunisation', description: 'Infant Immunisation Coverage' },
  { id: 'interestrates', description: 'Monthly Interest Rates' },
  { id: 'interestrates_annual', description: 'Annual Interest Rates' },
  { id: 'iowrt', description: 'Headline Wholesale & Retail Trade' },
  { id: 'iowrt_2d', description: 'Wholesale & Retail Trade by Division (2 digit)' },
  { id: 'iowrt_3d', description: 'Wholesale & Retail Trade by Group (3 digit)' },
  { id: 'ipi', description: 'Industrial Production Index (IPI)' },
  { id: 'ipi_1d', description: 'IPI by Section (1 digit)' },
  { id: 'ipi_2d', description: 'IPI by Division (2 digit)' },
  { id: 'ipi_3d', description: 'IPI by Group (3 digit)' },
  { id: 'ipi_5d', description: 'IPI by Item (5 digit)' },
  { id: 'ipi_domestic', description: 'IPI for Domestic-Oriented Divisions (2 digit)' },
  { id: 'ipi_export', description: 'IPI for Export-Oriented Divisions (2 digit)' },
  { id: 'lecturers_uni', description: 'Lecturers in Public Universities by Citizenship & Sex' },
  { id: 'lfs_district', description: 'Annual Principal Labour Force Statistics by District' },
  { id: 'lfs_month', description: 'Monthly Principal Labour Force Statistics' },
  { id: 'lfs_month_duration', description: 'Monthly Unemployment by Duration' },
  { id: 'lfs_month_sa', description: 'Monthly Principal Labour Force Statistics, Seasonally Adjusted' },
  { id: 'lfs_month_status', description: 'Monthly Employment by Status in Employment' },
  { id: 'lfs_month_youth', description: 'Monthly Youth Unemployment' },
  { id: 'lfs_qtr', description: 'Quarterly Principal Labour Force Statistics' },
  { id: 'lfs_qtr_sru_age', description: 'Quarterly Skills-Related Underemployment by Age' },
  { id: 'lfs_qtr_sru_sex', description: 'Quarterly Skills-Related Underemployment by Sex' },
  { id: 'lfs_qtr_state', description: 'Quarterly Principal Labour Force Statistics by State' },
  { id: 'lfs_qtr_tru_age', description: 'Quarterly Time-Related Underemployment by Age' },
  { id: 'lfs_qtr_tru_sex', description: 'Quarterly Time-Related Underemployment by Sex' },
  { id: 'lfs_state_sex', description: 'Annual Principal Labour Force Statistics by State & Sex' },
  { id: 'lfs_year', description: 'Annual Principal Labour Force Statistics' },
  { id: 'lfs_year_sex', description: 'Annual Principal Labour Force Statistics by Sex' },
  { id: 'local_authority_sex', description: 'Female Representation in Local Authorities' },
  { id: 'lookup_federal_finance', description: 'Lookup Table: Federal Finance' },
  { id: 'lookup_item', description: 'PriceCatcher: Item Lookup' },
  { id: 'lookup_money_banking', description: 'Lookup Table: Money & Banking' },
  { id: 'lookup_premise', description: 'PriceCatcher: Premise Lookup' },
  { id: 'lookup_state', description: 'PriceCatcher: State Lookup' },
  { id: 'mpr', description: 'Monetary Policy Rate' },
  { id: 'msic_lookup', description: 'Lookup Table: MSIC' },
  { id: 'pe_bop', description: 'Balance of Payments' },
  { id: 'pe_bop_qtr', description: 'Quarterly Balance of Payments' },
  { id: 'pe_iip', description: 'International Investment Position' },
  { id: 'pe_iip_qtr', description: 'Quarterly International Investment Position' },
  { id: 'pe_reserves', description: 'International Reserves' },
  { id: 'pms_state', description: 'Manufacturing Statistics by State' },
  { id: 'pms_subsector', description: 'Manufacturing Statistics by Subsector' },
  { id: 'population_age', description: 'Population by Age Group, Sex and Ethnicity' },
  { id: 'population_district', description: 'Population by District, Sex and Ethnicity' },
  { id: 'population_state', description: 'Population by State, Sex and Ethnicity' },
  { id: 'pricecatcher', description: 'PriceCatcher: Daily Prices' },
  { id: 'producer_price_index', description: 'Producer Price Index' },
  { id: 'producer_price_index_1d', description: 'Producer Price Index by Section (1 digit)' },
  { id: 'producer_price_index_2d', description: 'Producer Price Index by Division (2 digit)' },
  { id: 'producer_price_index_3d', description: 'Producer Price Index by Group (3 digit)' },
  { id: 'property_commercial_all', description: 'Commercial Property Transactions' },
  { id: 'property_commercial_state', description: 'Commercial Property Transactions by State' },
  { id: 'property_residences_all', description: 'Residential Property Transactions' },
  { id: 'property_residences_state', description: 'Residential Property Transactions by State' },
  { id: 'public_expenditure', description: 'Federal Government Expenditure' },
  { id: 'public_finance_snapshot', description: 'Snapshot of Public Finance' },
  { id: 'public_revenue', description: 'Federal Government Revenue' },
  { id: 'school_enrolment_nat', description: 'National School Enrolment by Type of School' },
  { id: 'school_enrolment_state', description: 'School Enrolment by State and Type of School' },
  { id: 'services_producer_price_index', description: 'Services Producer Price Index' },
  { id: 'services_producer_price_index_2d', description: 'Services Producer Price Index by Division (2 digit)' },
  { id: 'services_producer_price_index_3d', description: 'Services Producer Price Index by Group (3 digit)' },
  { id: 'social_security', description: 'Social Security Protection' },
  { id: 'student_enrolment_higher', description: 'Student Enrolment in Higher Education' },
  { id: 'student_enrolment_tvt', description: 'Student Enrolment in TVET' },
  { id: 'student_enrolment_uni', description: 'Student Enrolment in Public Universities' },
  { id: 'tourism_inbound_asean', description: 'Inbound Tourists by Country (ASEAN)' },
  { id: 'tourism_inbound_east_asia', description: 'Inbound Tourists by Country (East Asia)' },
  { id: 'tourism_inbound_europe', description: 'Inbound Tourists by Country (Europe)' },
  { id: 'tourism_inbound_long_haul', description: 'Inbound Tourists by Country (Long Haul)' },
  { id: 'tourism_inbound_monthly', description: 'Monthly Inbound Tourists' },
  { id: 'tourism_inbound_purpose', description: 'Inbound Tourists by Purpose of Visit' },
  { id: 'tourism_inbound_south_asia', description: 'Inbound Tourists by Country (South Asia)' },
  { id: 'tourism_inbound_total', description: 'Total Inbound Tourists' },
  { id: 'trade_balance', description: 'Balance of Trade' },
  { id: 'trade_balance_1d', description: 'Balance of Trade by Section (1 digit)' },
  { id: 'trade_balance_2d', description: 'Balance of Trade by Division (2 digit)' },
  { id: 'trade_country', description: 'Trade by Country' },
  { id: 'trade_export_1d', description: 'Exports by Section (1 digit)' },
  { id: 'trade_export_2d', description: 'Exports by Division (2 digit)' },
  { id: 'trade_export_3d', description: 'Exports by Group (3 digit)' },
  { id: 'trade_export_5d', description: 'Exports by Item (5 digit)' },
  { id: 'trade_import_1d', description: 'Imports by Section (1 digit)' },
  { id: 'trade_import_2d', description: 'Imports by Division (2 digit)' },
  { id: 'trade_import_3d', description: 'Imports by Group (3 digit)' },
  { id: 'trade_import_5d', description: 'Imports by Item (5 digit)' },
  { id: 'unemployment_rate', description: 'Unemployment Rate' },
  { id: 'unemployment_rate_sa', description: 'Unemployment Rate, Seasonally Adjusted' },
  { id: 'water_supply_area', description: 'Water Supply Coverage by Area' },
  { id: 'water_supply_state', description: 'Water Supply Coverage by State' }
];
import { prefixToolName } from './utils/tool-naming.js';

export function registerDataCatalogueTools(server: McpServer) {
  // List all datasets with rich metadata
  server.tool(
    prefixToolName('list_datasets_catalogue'),
    'Lists all datasets from the comprehensive catalogue with rich metadata',
    {
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ limit = 20, offset = 0 }) => {
      const paginatedDatasets = catalogueIndex.slice(offset, offset + limit);
      const total = catalogueIndex.length;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Datasets retrieved from comprehensive catalogue',
              total_datasets: total,
              showing: `${offset + 1}-${Math.min(offset + limit, total)} of ${total}`,
              pagination: {
                limit,
                offset,
                next_offset: offset + limit < total ? offset + limit : null,
                previous_offset: offset > 0 ? Math.max(0, offset - limit) : null,
              },
              datasets: paginatedDatasets,
              timestamp: new Date().toISOString()
            }, null, 2),
          },
        ],
      };
    }
  );
  
  // Search datasets by query
  server.tool(
    prefixToolName('search_datasets'),
    'Search datasets by keywords across titles, descriptions and metadata',
    {
      query: z.string().describe('Search query to match against dataset metadata'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
    },
    async ({ query, limit = 20 }) => {
      const searchResults = searchDatasets(query);
      const limitedResults = searchResults.slice(0, limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Search results for datasets',
              query,
              total_matches: searchResults.length,
              showing: Math.min(limit, searchResults.length),
              datasets: limitedResults,
              timestamp: new Date().toISOString()
            }, null, 2),
          },
        ],
      };
    }
  );
  
  // Filter datasets by various criteria
  server.tool(
    prefixToolName('filter_datasets'),
    'Filter datasets by category, geography, frequency, demography, data source or year range',
    {
      category: z.string().optional().describe('Category or subcategory to filter by'),
      geography: z.string().optional().describe('Geographic coverage to filter by (e.g., NATIONAL, STATE, DISTRICT)'),
      frequency: z.string().optional().describe('Data frequency to filter by (e.g., DAILY, MONTHLY, YEARLY)'),
      demography: z.string().optional().describe('Demographic dimension to filter by (e.g., SEX, AGE)'),
      dataSource: z.string().optional().describe('Data source agency to filter by (e.g., DOSM, BNM)'),
      startYear: z.number().optional().describe('Start year for filtering datasets by time coverage'),
      endYear: z.number().optional().describe('End year for filtering datasets by time coverage'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
    },
    async ({ category, geography, frequency, demography, dataSource, startYear, endYear, limit = 20 }) => {
      const yearRange = startYear && endYear ? [startYear, endYear] as [number, number] : undefined;
      
      const filteredDatasets = filterDatasets({
        category,
        geography,
        frequency,
        demography,
        dataSource,
        yearRange
      });
      
      const limitedResults = filteredDatasets.slice(0, limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Filtered datasets',
              filters: {
                category,
                geography,
                frequency,
                demography,
                dataSource,
                year_range: yearRange ? `${yearRange[0]}-${yearRange[1]}` : undefined
              },
              total_matches: filteredDatasets.length,
              showing: Math.min(limit, filteredDatasets.length),
              datasets: limitedResults,
              timestamp: new Date().toISOString()
            }, null, 2),
          },
        ],
      };
    }
  );
  
  // Get dataset details by ID from catalogue
  server.tool(
    prefixToolName('get_dataset_metadata'),
    'Get comprehensive metadata for a dataset by ID from the local catalogue',
    {
      id: z.string().describe('ID of the dataset to retrieve metadata for'),
    },
    async ({ id }) => {
      const dataset = getDatasetById(id);
      
      if (!dataset) {
        // Try to find similar datasets for suggestion
        const similarDatasets = catalogueIndex
          .filter((d: DatasetMetadata) => d.id.includes(id) || id.includes(d.id))
          .map((d: DatasetMetadata) => ({ id: d.id, title_en: d.title_en }))
          .slice(0, 5);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Dataset with ID "${id}" not found in the catalogue`,
                suggested_datasets: similarDatasets.length > 0 ? similarDatasets : undefined,
                total_datasets_available: catalogueIndex.length,
                note: 'Use list_datasets_catalogue to see all available datasets',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Dataset metadata retrieved successfully',
              dataset,
              download_links: {
                parquet: dataset.link_parquet || null,
                csv: dataset.link_csv || null,
                preview: dataset.link_preview || null
              },
              timestamp: new Date().toISOString()
            }, null, 2),
          },
        ],
      };
    }
  );
  
  // Get available filter values
  server.tool(
    prefixToolName('get_catalogue_filters'),
    'Get all available filter values for searching and filtering datasets',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Available filter values for the dataset catalogue',
              filters: catalogueFilters,
              total_datasets: catalogueIndex.length,
              timestamp: new Date().toISOString()
            }, null, 2),
          },
        ],
      };
    }
  );
  
  // Legacy tool - List known dataset IDs (keeping for backward compatibility)
  server.tool(
    prefixToolName('list_known_datasets'),
    'Lists known dataset IDs that can be used with the OpenDOSM API',
    {},
    async () => {
      // Convert our rich catalogue to the simple format for backward compatibility
      const simpleDatasets = catalogueIndex.map((dataset: DatasetMetadata) => ({
        id: dataset.id,
        description: dataset.title_en
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Available dataset IDs for OpenDOSM API',
              datasets: simpleDatasets,
              note: 'Use these dataset IDs with the get_dataset_details tool, or try the new get_dataset_metadata tool for richer information',
              timestamp: new Date().toISOString()
            }, null, 2),
          },
        ],
      };
    }
  );

  // List datasets
  server.tool(
    prefixToolName('list_datasets'),
    'Lists available datasets in the Malaysia Open Data catalogue',
    {
      id: z.string().optional().describe('Dataset ID to retrieve (e.g., "cpi_core")'),
      limit: z.number().min(1).max(100).optional().describe('Number of results to return (1-100)'),
      meta: z.boolean().optional().describe('Whether to return metadata about available datasets'),
    },
    async ({ id, limit = 10, meta = false }) => {
      try {
        // If no dataset ID is provided, return the list of known datasets instead
        if (!id) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: 'The OpenDOSM API requires a specific dataset ID',
                  note: 'Please use one of the following dataset IDs:',
                  available_datasets: KNOWN_DATASETS,
                  example_usage: 'Use list_datasets with id="cpi_core" or get_dataset_details with id="cpi_core"',
                  timestamp: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }

        const url = `${API_BASE_URL}${OPENDOSM_ENDPOINT}`;
        const params: Record<string, any> = { id };
        
        // Add additional parameters if provided
        if (limit) params.limit = limit;
        if (meta) params.meta = 1;

        // Setup request headers
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        const response = await axios.get(url, { params, headers });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Datasets retrieved successfully',
                dataset_id: id,
                params: params,
                endpoint: url,
                datasets: response.data,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching datasets:', error);
        
        // Check if this might be due to an invalid dataset ID
        const knownIds = KNOWN_DATASETS.map(dataset => dataset.id);
        const suggestedDatasets = id ? 
          KNOWN_DATASETS.filter(dataset => dataset.id.includes(id.toLowerCase()) || 
                                         dataset.description.toLowerCase().includes(id.toLowerCase())) : 
          [];
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch datasets',
                message: error instanceof Error ? error.message : 'Unknown error',
                status: axios.isAxiosError(error) ? error.response?.status : undefined,
                possible_issue: id && !knownIds.includes(id) ? `Dataset ID "${id}" may not be valid` : undefined,
                suggested_datasets: suggestedDatasets.length > 0 ? suggestedDatasets : undefined,
                available_datasets: 'Use list_known_datasets tool to see all available dataset IDs',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Get dataset details
  server.tool(
    prefixToolName('get_dataset_details'),
    'Gets detailed information about a specific dataset',
    {
      id: z.string().describe('ID of the dataset to retrieve (e.g., "cpi_core")'),
      limit: z.number().min(1).optional().describe('Maximum number of records to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination'),
    },
    async ({ id, limit = 10, offset }) => {
      try {
        // Validate if the dataset ID is known
        const knownIds = KNOWN_DATASETS.map(dataset => dataset.id);
        if (!knownIds.includes(id)) {
          const suggestedDatasets = KNOWN_DATASETS.filter(dataset => 
            dataset.id.includes(id.toLowerCase()) || 
            dataset.description.toLowerCase().includes(id.toLowerCase())
          );
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  warning: `Dataset ID "${id}" may not be valid`,
                  suggested_datasets: suggestedDatasets.length > 0 ? suggestedDatasets : undefined,
                  available_datasets: KNOWN_DATASETS,
                  note: 'The dataset ID you provided is not in our known list, but we will try to fetch it anyway.',
                  timestamp: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }
        
        const url = `${API_BASE_URL}${OPENDOSM_ENDPOINT}`;
        const params: Record<string, any> = { id };
        
        // Add optional parameters if provided
        if (limit) params.limit = limit;
        if (offset !== undefined) params.offset = offset;
        
        // Setup request headers
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        const response = await axios.get(url, { params, headers });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Dataset details retrieved successfully',
                dataset_id: id,
                endpoint: url,
                details: response.data,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching dataset details:', error);
        
        // Check if this might be due to an invalid dataset ID
        const knownIds = KNOWN_DATASETS.map(dataset => dataset.id);
        const suggestedDatasets = KNOWN_DATASETS.filter(dataset => 
          dataset.id.includes(id.toLowerCase()) || 
          dataset.description.toLowerCase().includes(id.toLowerCase())
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch dataset details',
                dataset_id: id,
                message: error instanceof Error ? error.message : 'Unknown error',
                status: axios.isAxiosError(error) ? error.response?.status : undefined,
                possible_issue: !knownIds.includes(id) ? `Dataset ID "${id}" may not be valid` : undefined,
                suggested_datasets: suggestedDatasets.length > 0 ? suggestedDatasets : undefined,
                available_datasets: 'Use list_known_datasets tool to see all available dataset IDs',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // List dataset categories from our comprehensive filters
  server.tool(
    prefixToolName('list_dataset_categories'),
    'Lists all available dataset categories from the catalogue',
    {},
    async () => {
      try {
        // Group datasets by category
        const categoryCounts: Record<string, number> = {};
        
        // Count datasets in each category
        catalogueIndex.forEach((dataset: DatasetMetadata) => {
          dataset.site_category.forEach((cat: SiteCategory) => {
            const category = cat.category_en;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        });
        
        // Format as array of objects with category and count
        const categoriesWithCounts = Object.entries(categoryCounts).map(([category, count]) => ({
          category,
          dataset_count: count
        })).sort((a, b) => a.category.localeCompare(b.category));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Dataset categories available',
                categories: categoriesWithCounts,
                total_categories: categoriesWithCounts.length,
                note: 'For specific datasets, use the filter_datasets tool with the category parameter',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error generating dataset categories:', error);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to generate dataset categories',
                message: error instanceof Error ? error.message : 'Unknown error',
                alternative: 'Please use list_datasets_catalogue to see available datasets',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // List dataset agencies from our comprehensive filters
  server.tool(
    prefixToolName('list_dataset_agencies'),
    'Lists all agencies (data sources) providing datasets',
    {},
    async () => {
      try {
        // Count datasets from each data source
        const agencyCounts: Record<string, number> = {};
        
        catalogueIndex.forEach((dataset: DatasetMetadata) => {
          dataset.data_source.forEach((source: string) => {
            agencyCounts[source] = (agencyCounts[source] || 0) + 1;
          });
        });
        
        // Format as array of objects with agency and count
        const agenciesWithCounts = Object.entries(agencyCounts).map(([agency, count]) => ({
          agency,
          dataset_count: count
        })).sort((a, b) => b.dataset_count - a.dataset_count);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Dataset agencies available',
                agencies: agenciesWithCounts,
                total_agencies: agenciesWithCounts.length,
                note: 'For specific datasets, use the filter_datasets tool with the dataSource parameter',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error generating dataset agencies:', error);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to generate dataset agencies',
                message: error instanceof Error ? error.message : 'Unknown error',
                alternative: 'Please use list_datasets_catalogue to see available datasets',
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }
    }
  );
  
  // The following tools are kept for backward compatibility with the OpenDOSM API
  // They make direct API calls rather than using our local catalogue
}
