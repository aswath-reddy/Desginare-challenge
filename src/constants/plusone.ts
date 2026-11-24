import type { ActivityCategory } from '@/src/types/plusone';

export const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || 'shanmukh.patamsetti05@gmail.com';

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'Coffee & Conversations',
  'Art & Culture',
  'Food & Dining',
  'Outdoor Adventures',
  'Movies & Entertainment',
  'Games & Hobbies',
  'Fitness & Wellness',
  'Networking',
  'Explore the City',
  'Something Spontaneous',
];

export const CATEGORY_DESCRIPTIONS: Record<ActivityCategory, string> = {
  'Coffee & Conversations': 'Pour-overs, quiet corners, and unhurried conversation.',
  'Art & Culture': 'Museums, gallery openings, and architectural walks.',
  'Food & Dining': 'Neighborhood spots, supper tables, and farmers markets.',
  'Outdoor Adventures': 'Trail hikes, coastal walks, and golden-hour picnics.',
  'Movies & Entertainment': 'Indie screenings, live jazz, and repertory cinema.',
  'Games & Hobbies': 'Board game nights, book clubs, and analog crafts.',
  'Fitness & Wellness': 'Social run clubs, morning yoga, and climbing sessions.',
  'Networking': 'Casual founder coffees and creative peer meetups.',
  'Explore the City': 'Photo walks, ferry rides, and hidden neighborhood tours.',
  'Something Spontaneous': 'Last-minute plans when the afternoon opens up.',
};

export const SOCIAL_VIBES = [
  'Small, meaningful conversations',
  'Energetic group experiences',
  'Spontaneous adventures',
  'Relaxed, low-pressure hangouts',
  'Open to everything',
] as const;

export const USER_GOALS = [
  'Make new friends',
  'Explore new places',
  'Find activity partners',
  'Meet people in a new city',
  'Build my network',
  'Try something different',
] as const;

export const POPULAR_CITIES = [
  'New York',
  'San Francisco',
  'London',
  'Austin',
  'Chicago',
  'Seattle',
  'Los Angeles',
  'Boston',
  'Toronto',
  'Berlin',
] as const;

export const CURATED_COVER_IMAGES = [
  {
    id: 'museum',
    label: 'Museum & Gallery',
    url: '/src/assets/images/hero_museum_friends_1795515126961.jpg',
    category: 'Art & Culture' as ActivityCategory,
  },
  {
    id: 'coffee',
    label: 'Coffee & Conversation',
    url: '/src/assets/images/activity_coffee_chat_1795515125338.jpg',
    category: 'Coffee & Conversations' as ActivityCategory,
  },
  {
    id: 'hike',
    label: 'Coastal Trail & Outdoors',
    url: '/src/assets/images/activity_sunset_hike_1795515128243.jpg',
    category: 'Outdoor Adventures' as ActivityCategory,
  },
  {
    id: 'games',
    label: 'Board Games & Lounge',
    url: '/src/assets/images/activity_board_games_1795515127831.jpg',
    category: 'Games & Hobbies' as ActivityCategory,
  },
  {
    id: 'market',
    label: 'Farmers Market & City Walk',
    url: '/src/assets/images/activity_farmers_market_1795515128758.jpg',
    category: 'Food & Dining' as ActivityCategory,
  },
] as const;

export const VALIDATION_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  DISPLAY_NAME_MAX: 80,
  BIO_MAX: 500,
  CITY_MAX: 100,
  TITLE_MIN: 3,
  TITLE_MAX: 120,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 2000,
  VENUE_NAME_MIN: 2,
  VENUE_NAME_MAX: 120,
  VENUE_ADDRESS_MIN: 3,
  VENUE_ADDRESS_MAX: 200,
  INSTRUCTIONS_MIN: 3,
  INSTRUCTIONS_MAX: 1500,
  WHAT_TO_BRING_MAX: 600,
  INTRO_MESSAGE_MAX: 500,
  CHAT_MESSAGE_MAX: 1500,
  FEEDBACK_COMMENTS_MAX: 1000,
  REPORT_REASON_MAX: 120,
  REPORT_DESCRIPTION_MAX: 1000,
  CAPACITY_MIN: 2,
  CAPACITY_MAX: 50,
} as const;
