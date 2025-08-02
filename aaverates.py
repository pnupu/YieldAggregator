#!/usr/bin/env python3
"""
Multi-Protocol Aave Supply Rates Scraper

This script scrapes supply rates from multiple Aave protocol pages.
Based on the working single-protocol version, extended for multiple sites.
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import json
from typing import List, Dict, Optional
import os

class AaveSupplyRateScraper:
    def __init__(self):
        self.urls = [
            ('mainnet', 'https://aavescan.com/'),
            ('base-v3', 'https://aavescan.com/base-v3'),
            ('polygon-v3', 'https://aavescan.com/polygon-v3'),
            ('optimism-v3', 'https://aavescan.com/optimism-v3'),
            ('arbitrum-v3', 'https://aavescan.com/arbitrum-v3'),
            ('sonic-v3', 'https://aavescan.com/sonic-v3')
        ]
        
        self.session = requests.Session()
        # Set headers to mimic a real browser
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse the page - same as working version"""
        try:
            print(f"Fetching data from {url}...")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            print("Page fetched successfully!")
            return soup
            
        except requests.RequestException as e:
            print(f"Error fetching page: {e}")
            return None
    
    def extract_supply_rates(self, soup: BeautifulSoup, protocol_name: str) -> List[Dict[str, str]]:
        """Extract supply rates and smart contract addresses"""
        supply_data = []
        
        # First, extract all contract addresses from the page
        contract_addresses = self.extract_contract_addresses(soup)
        print(f"Found {len(contract_addresses)} contract addresses on {protocol_name}")
        
        # Look for common table structures that might contain supply rate data
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            headers = []
            
            # Get headers from the first row
            if rows:
                header_row = rows[0]
                headers = [th.get_text(strip=True).lower() for th in header_row.find_all(['th', 'td'])]
                
                # Check if this table contains supply rate information
                if any(keyword in ' '.join(headers) for keyword in ['supply', 'rate', 'apy', 'apr']):
                    print(f"Found potential supply rate table with headers: {headers}")
                    
                    # Process data rows
                    for row_idx, row in enumerate(rows[1:]):
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 2:
                            row_data = {'protocol': protocol_name}  # Add protocol name
                            
                            # Extract contract address from this row if present
                            row_contract = self.extract_contract_from_element(row)
                            if row_contract:
                                row_data['contract_address'] = row_contract
                            
                            for i, cell in enumerate(cells):
                                if i < len(headers):
                                    row_data[headers[i]] = cell.get_text(strip=True)
                                    
                                    # Also check for contract address in cell attributes
                                    cell_contract = self.extract_contract_from_element(cell)
                                    if cell_contract and 'contract_address' not in row_data:
                                        row_data['contract_address'] = cell_contract
                            
                            # Only add if we have meaningful data
                            if any(row_data.values()):
                                supply_data.append(row_data)
        
        # Alternative: Look for div-based layouts (common in modern web apps)
        if not supply_data:
            print(f"No table found, looking for div-based layouts...")
            
            # Look for containers that might hold asset information
            asset_containers = soup.find_all('div', class_=lambda x: x and any(
                keyword in x.lower() for keyword in ['asset', 'token', 'supply', 'rate', 'card', 'row']
            ))
            
            for container in asset_containers[:10]:  # Limit to first 10 to avoid too much noise
                text_content = container.get_text(strip=True)
                if '%' in text_content and len(text_content) < 200:  # Likely contains rate info
                    # Try to extract asset name and rate
                    lines = [line.strip() for line in text_content.split('\n') if line.strip()]
                    if len(lines) >= 2:
                        container_data = {
                            'protocol': protocol_name,
                            'container_text': text_content,
                            'lines': ' | '.join(lines[:5])  # First 5 lines
                        }
                        
                        # Extract contract address from container
                        container_contract = self.extract_contract_from_element(container)
                        if container_contract:
                            container_data['contract_address'] = container_contract
                        
                        supply_data.append(container_data)
        
        # Look for specific patterns that might indicate supply rates
        if not supply_data:
            print("Looking for percentage patterns...")
            percentage_elements = soup.find_all(text=lambda text: text and '%' in text)
            
            for element in percentage_elements[:20]:  # Limit to first 20
                parent = element.parent
                if parent:
                    context = parent.get_text(strip=True)
                    if len(context) < 100 and any(keyword in context.lower() for keyword in ['supply', 'apy', 'apr']):
                        element_data = {
                            'protocol': protocol_name,
                            'context': context,
                            'element_tag': parent.name,
                            'element_class': parent.get('class', [])
                        }
                        
                        # Extract contract address from parent element
                        parent_contract = self.extract_contract_from_element(parent)
                        if parent_contract:
                            element_data['contract_address'] = parent_contract
                        
                        supply_data.append(element_data)
        
        # If we found contract addresses but no supply data in tables/divs, 
        # create entries for the contracts we found
        if not supply_data and contract_addresses:
            print(f"No supply data found in standard elements, but found {len(contract_addresses)} contracts")
            for addr in contract_addresses:
                supply_data.append({
                    'protocol': protocol_name,
                    'contract_address': addr,
                    'extraction_method': 'contract_only'
                })
        
        print(f"Extracted {len(supply_data)} potential supply rate entries from {protocol_name}")
        return supply_data
    
    def extract_contract_addresses(self, soup: BeautifulSoup) -> List[str]:
        """Extract all smart contract addresses from the page"""
        import re
        
        contracts = set()  # Use set to avoid duplicates
        
        # Pattern for Ethereum addresses (0x followed by 40 hex characters)
        eth_address_pattern = re.compile(r'0x[0-9a-fA-F]{40}')
        
        # Method 1: Look for addresses in id attributes
        elements_with_ids = soup.find_all(attrs={'id': True})
        for element in elements_with_ids:
            element_id = element.get('id', '')
            if eth_address_pattern.match(element_id):
                contracts.add(element_id)
        
        # Method 2: Look for addresses in data attributes
        for attr_name in ['data-address', 'data-contract', 'data-token', 'data-asset']:
            elements = soup.find_all(attrs={attr_name: True})
            for element in elements:
                value = element.get(attr_name, '')
                if eth_address_pattern.match(value):
                    contracts.add(value)
        
        # Method 3: Look for addresses in class names
        all_elements = soup.find_all(class_=True)
        for element in all_elements:
            classes = element.get('class', [])
            for class_name in classes:
                if eth_address_pattern.match(class_name):
                    contracts.add(class_name)
        
        # Method 4: Look for addresses in href attributes (links)
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            matches = eth_address_pattern.findall(href)
            contracts.update(matches)
        
        # Method 5: Look for addresses in text content
        page_text = soup.get_text()
        text_matches = eth_address_pattern.findall(page_text)
        contracts.update(text_matches)
        
        # Method 6: Look in common input/button value attributes
        inputs = soup.find_all(['input', 'button'], value=True)
        for inp in inputs:
            value = inp.get('value', '')
            if eth_address_pattern.match(value):
                contracts.add(value)
        
        return list(contracts)
    
    def extract_contract_from_element(self, element) -> Optional[str]:
        """Extract contract address from a specific element and its attributes"""
        import re
        
        eth_address_pattern = re.compile(r'0x[0-9a-fA-F]{40}')
        
        # Check common attributes
        for attr in ['id', 'data-address', 'data-contract', 'data-token', 'data-asset', 'href', 'value']:
            if element.has_attr(attr):
                value = element.get(attr, '')
                if eth_address_pattern.match(value):
                    return value
        
        # Check class names
        if element.has_attr('class'):
            for class_name in element.get('class', []):
                if eth_address_pattern.match(class_name):
                    return class_name
        
        # Check text content
        text = element.get_text(strip=True)
        match = eth_address_pattern.search(text)
        if match:
            return match.group()
        
        # Check child elements
        for child in element.find_all(['a', 'span', 'div'], limit=5):  # Limit to avoid deep recursion
            child_contract = self.extract_contract_from_element(child)
            if child_contract:
                return child_contract
        
        return None
    
    def save_data(self, all_data: List[Dict], format_type: str = 'json'):
        """Save the extracted data to a file"""
        if not all_data:
            print("No data to save")
            return
        
        timestamp = int(time.time())
        
        if format_type.lower() == 'json':
            filename = f'aave_all_protocols.json'
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, indent=2, ensure_ascii=False)
            print(f"Data saved to {filename}")
        
        elif format_type.lower() == 'csv':
            filename = f'aave_all_protocols.csv'
            df = pd.DataFrame(all_data)
            df.to_csv(filename, index=False)
            print(f"Data saved to {filename}")
    
    def scrape_all_protocols(self, save_format: str = 'json') -> List[Dict]:
        """Main method to scrape all protocols"""
        print("Starting multi-protocol Aave supply rates scraping...")
        print(f"Will scrape {len(self.urls)} protocols")
        
        all_supply_data = []
        
        for protocol_name, url in self.urls:
            print(f"\n--- Processing {protocol_name} ---")
            
            # Add delay between requests to be respectful
            if all_supply_data:  # Don't delay on first request
                time.sleep(2)
            
            # Fetch the page
            soup = self.fetch_page(url)
            if not soup:
                print(f"Skipping {protocol_name} due to fetch error")
                continue
            
            # Extract supply rates
            protocol_data = self.extract_supply_rates(soup, protocol_name)
            all_supply_data.extend(protocol_data)
        
        # Display results summary
        print(f"\n--- SUMMARY ---")
        protocols_with_data = {}
        for item in all_supply_data:
            protocol = item.get('protocol', 'unknown')
            protocols_with_data[protocol] = protocols_with_data.get(protocol, 0) + 1
        
        for protocol, count in protocols_with_data.items():
            print(f"{protocol}: {count} entries")
        
        if all_supply_data:
            print(f"\nTotal entries found: {len(all_supply_data)}")
            
            # Show first few entries
            print("\n--- Sample Data (first 3 entries) ---")
            for i, item in enumerate(all_supply_data[:3], 1):
                print(f"\nEntry {i}:")
                for key, value in item.items():
                    print(f"  {key}: {value}")
        else:
            print("No supply rate data found across any protocols.")
        
        # Save data
        if all_supply_data and save_format:
            self.save_data(all_supply_data, save_format)
        
        return all_supply_data

def main():
    """Main function to run the scraper"""
    scraper = AaveSupplyRateScraper()
    
    try:
        # Scrape all protocols and save as JSON
        supply_rates = scraper.scrape_all_protocols(save_format='json')
        
        # Also save as CSV if pandas is available
        try:
            scraper.save_data(supply_rates, 'csv')
        except Exception as e:
            print(f"Could not save as CSV: {e}")
        
        print(f"\nScraping completed! Found {len(supply_rates)} total entries across all protocols.")
        
    except KeyboardInterrupt:
        print("\nScraping interrupted by user.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Install required packages if not available
    try:
        import requests
        import bs4
        import pandas as pd
    except ImportError as e:
        print(f"Missing required package: {e}")
        print("Please install required packages:")
        print("pip install requests beautifulsoup4 pandas")
        exit(1)
    
    main()