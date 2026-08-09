# AutoFish FreeTime Frontend

AutoFish FreeTime is an automated management and operations tool based on the Xianyu platform, offering features such as product management, account management, batch publishing, and data monitoring to help users manage their Xianyu stores more efficiently.

## Features

### 📦 Product Management
- Product list management and filtering
- Product listing and unlisting operations
- Keyword auto-reply rule configuration
- Shipping/Receipt Gift/Review Gift settings
- Batch editing of product information

### 👥 Account Management
- Multi-account binding and management
- Account status monitoring
- Proxy server configuration
- Link login management

### 🚀 Batch Creation & Publishing System
- Product monitoring and trend analysis
- Business opportunity discovery and binding
- AI-assisted material creation
- Publishing progress tracking

### 📊 Data Monitoring
- Product performance metric analysis
- Historical trend charts
- Exception alert system
- Stability diagnostics

### 💰 Membership & Billing
- Membership level management
- Windstone recharge
- Order history inquiry
- Function pricing configuration

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **Styles**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Data Visualization**: Apache ECharts
- **UI Components**: Custom Component Library
- **Form Handling**: React Hook Form + Zod
- **HTTP Client**: Native fetch

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication module (Login/Register)
│   ├── admin/             # Admin dashboard
│   │   ├── accounts/      # Account management
│   │   ├── billing/       # Billing management
│   │   ├── proxy/         # Proxy management
│   │   └── users/         # User management
│   ├── dashboard/         # User functional area
│   │   ├── accounts/      # Account management
│   │   ├── batch-publish/ # Batch publishing
│   │   ├── items/         # Product management
│   │   └── settings/      # Personal settings
│   └── login/             # Login related
├── components/            # React components
│   ├── accounts/          # Account-related components
│   ├── ai-config/         # AI configuration components
│   ├── auth/              # Authentication components
│   ├── batch-publish/     # Batch publishing components
│   │   ├── materials/     # Material management
│   │   ├── monitor/       # Monitoring module
│   │   ├── workbench/     # Workbench
│   │   └── shared/        # Shared components
│   ├── items/             # Product management components
│   │   ├── drawers/       # Drawer components
│   │   ├── parts/         # Sub-components
│   │   └── views/         # View components
│   ├── layout/            # Layout components
│   ├── settings/          # Settings components
│   └── ui/                # Common UI components
│       ├── chart/         # Chart components
│       ├── data/          # Data display components
│       ├── feedback/      # Feedback components
│       ├── navigation/    # Navigation components
│       └── overlay/       # Overlay components
├── hooks/                 # Custom Hooks
├── lib/                   # Utility libraries
│   ├── api/               # API client
│   ├── constants/         # Constant definitions
│   └── utils/             # Utility functions
├── stores/                # Zustand state management
├── types/                 # TypeScript type definitions
└── styles/                # Global styles
```

## Quick Start

### Environment Requirements

- Node.js 18+
- pnpm 8+ / npm 9+ / yarn 1.22+

### Install Dependencies

```bash
pnpm install
```

### Environment Variable Configuration

Copy the `.env.example` file and rename it to `.env`, then configure the following variables according to your actual situation:

```env
# API Address
NEXT_PUBLIC_API_URL=https://your-api-server.com

# Other configurations...
```

### Development Mode

```bash
pnpm dev
```

After starting, access `http://localhost:3000`

### Production Build

```bash
pnpm build
pnpm start
```

## Development Guidelines

### Code Style

- Follow ESLint and Prettier configurations
- Use TypeScript strict mode
- Components use PascalCase naming (e.g., `ProductCard.tsx`)
- Hooks use camelCase naming (e.g., `useItemsData.ts`)

### Component Design Principles

1. **Single Responsibility**: Each component does only one thing.
2. **Props Control**: Consider splitting when there are more than 2 props.
3. **Line Count**: Consider splitting when exceeding 300 lines.
4. **No Embedding**: Defining other components inside a component is prohibited.

### State Management

- **React Query**: Server state management (API data)
- **Zustand**: Client-side global state (e.g., user information, UI state)
- **useState/useReducer**: Component local state

### Chart Specifications

- Must use the `useChart` Hook
- Import ECharts on demand
- Chart color schemes must follow design tokens
- Tooltip colors synchronized with series colors

### Error Handling

- Global ErrorBoundary captures unexpected errors
- Classified handling of API errors
- User-friendly error messages
- Console output prohibited in production environment

## Browser Support

- Chrome (latest version)
- Safari (latest version)
- Firefox (latest version)
- Edge (latest version)

## License

This project is for learning and research purposes only.

## Contributing Guide

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request