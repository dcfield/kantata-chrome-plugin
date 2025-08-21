# Kantata Chrome Plugin

## Overview

A Chrome Manifest V3 extension designed to enhance productivity and user experience when working with Kantata project management interfaces. This extension provides four distinct features: global toggle functionality, cursor behavior improvements, visual tracking aids, and project cost calculation tools. Built with a focus on minimal UI interference while maximizing workflow efficiency for project managers and resource planners.

## Problem Statement

Working with Kantata's project management interface presented several workflow inefficiencies:

1. **Bulk Operations**: No native way to perform bulk user toggle operations, requiring dozens of individual clicks for team management tasks
2. **Navigation Precision**: Hand cursor behavior interfered with precise navigation in resource planning tables
3. **Column Tracking**: Difficulty maintaining visual alignment when working with complex resource allocation spreadsheets
4. **Cost Calculations**: Manual percentage calculations for project estimates were time-consuming and error-prone, especially for proposal generation

These inefficiencies compounded during busy project planning periods, leading to reduced productivity and potential calculation errors in client proposals.

## Solution Approach

### Research & Planning Phase
1. **User Journey Analysis**: Observed daily workflows to identify repetitive tasks and pain points
2. **DOM Investigation**: Analyzed Kantata's interface structure to find reliable element selectors
3. **Chrome Extension Architecture**: Researched Manifest V3 requirements and best practices for dynamic content injection

## Features

### 1. Click All "Toggle User" Buttons
- **Global Feature**: Works on any page
- **Function**: Simultaneously clicks all buttons with `aria-label="Toggle User"` and `title="Toggle User"`
- **Use Case**: Bulk user management operations
- **Access**: Single button in extension popup
- **Feedback**: Console logging for each successful click and summary messages

### 2. Disable Hand Cursor on /resourcing Pages
- **Scope**: Only active on pages containing `/resourcing` in URL
- **Function**: Overrides hand cursor with default pointer for improved navigation
- **Control**: Dropdown toggle in popup (On/Off)
- **Default**: Enabled
- **Implementation**: Dynamic CSS injection with `cursor: default !important`

### 3. Orange Vertical Cursor Line in Resourcing Tables
- **Scope**: Only active on pages containing `/resourcing` in URL  
- **Function**: Displays a 2px orange vertical line (24px tall) following cursor movement within `div[role="presentation"]` elements
- **Control**: Checkbox toggle in popup
- **Default**: Enabled
- **Use Case**: Precise column tracking in resource planning tables
- **Implementation**: Dynamic JavaScript behavior attachment/detachment

### 4. Project Estimate Calculator
- **Scope**: Global feature with intelligent cost detection
- **Function**: Persistent banner displaying project cost calculations with adjustable margin percentages
- **Features**:
  - Automatic extraction of "Est. Cost" values from Kantata interfaces
  - Bidirectional calculation (margin % ↔ target fee)
  - Multi-currency support (€, £, $)
  - Manual calculation triggers via dedicated buttons
- **Control**: Checkbox toggle in popup ("Activate Fixed Fee Plugin")
- **Default**: Disabled
- **Position**: Fixed banner at top of viewport with orange gradient styling

## Installation

### Manual Installation (Development)
1. Clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the project directory
5. The extension icon should appear in your Chrome toolbar

## Usage

### Accessing Controls
1. Click the Kantata extension icon in your Chrome toolbar
2. A popup menu will display all available feature toggles

### Feature Controls
- **Toggle User Buttons**: Click "Click All Toggle User Buttons" to execute
- **Hand Cursor Fix**: Select "On" or "Off" from dropdown (persists across sessions)
- **Orange Cursor Line**: Check/uncheck to enable/disable (persists across sessions)
- **Fixed Fee Calculator**: Check/uncheck "Activate Fixed Fee Plugin" to show/hide banner

### Using the Project Calculator
1. Enable "Activate Fixed Fee Plugin" in popup
2. Navigate to a page containing project cost information
3. The banner will automatically extract and display the estimated cost
4. Enter desired margin percentage and click "Calculate Fee"
5. Or enter target fee and click "Calculate Margin" for reverse calculation
6. All calculations update manually via button clicks for precise control

## Screenshots

- tbc

### Workflow Enhancements
- **Proposal Generation**: Streamlined cost calculation process enables faster client proposal turnaround
- **Resource Planning**: Enhanced table navigation reduces eye strain and improves data accuracy
- **Team Management**: Bulk operations capability scales better with larger team sizes

### Technical Achievements
- **Zero Page Load Impact**: Dynamic injection approach maintains original page performance
- **Cross-Session Persistence**: User preferences maintained across browser sessions and devices
- **Multi-Currency Support**: Handles international project calculations automatically
- **Error-Resilient Design**: Graceful degradation when page structures change

### User Adoption
- **Daily Active Usage**: All four features integrated into regular workflow
- **Error Reduction**: Significantly decreased calculation mistakes in client-facing documents
- **Scalability**: Solution handles projects ranging from small teams to enterprise-level resource planning