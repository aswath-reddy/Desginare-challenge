import { Timestamp } from 'firebase/firestore';
import { CURATED_COVER_IMAGES } from '@/src/constants/plusone';
import type { Activity, ActivityCategory, ActivityPrivateDetails, ActivityRoster } from '@/src/types/plusone';

export interface DemoActivityTemplate {
  slug: string;
  title: string;
  category: ActivityCategory;
  description: string;
  coverImageURL: string;
  venueName: string;
  venueAddress: string;
  city: string;
  timeZone: string;
  startOffsetHours: number;
  durationHours: number;
  capacity: number;
  approvedParticipantCount: number;
  estimatedCost: number;
  currency: string;
  hostName: string;
  meetingInstructions: string;
  whatToBring: string;
}

export const DEMO_ACTIVITY_TEMPLATES: DemoActivityTemplate[] = [
  {
    slug: 'nyc_museum_morning',
    title: 'Museum day with new friends',
    category: 'Art & Culture',
    description:
      "We're exploring the contemporary wing and grabbing pour-over coffee afterward. New people are always welcome — no art history degree needed.",
    coverImageURL: CURATED_COVER_IMAGES[0].url,
    venueName: 'Modern Art Pavilion',
    venueAddress: '11 West 53rd Street',
    city: 'New York',
    timeZone: 'America/New_York',
    startOffsetHours: 26,
    durationHours: 3,
    capacity: 6,
    approvedParticipantCount: 3,
    estimatedCost: 25,
    currency: 'USD',
    hostName: 'Maya Chen',
    meetingInstructions: 'Meet inside the main stone lobby near the coat check desk.',
    whatToBring: 'Comfortable walking shoes and museum ticket.',
  },
  {
    slug: 'nyc_coffee_run',
    title: 'Coffee with strangers',
    category: 'Coffee & Conversations',
    description:
      'A relaxed morning pour-over and honest conversation over notebooks and good pastries. Great if you want low-pressure company before the day ramps up.',
    coverImageURL: CURATED_COVER_IMAGES[1].url,
    venueName: 'Sey Coffee Roastery',
    venueAddress: '18 Grattan Street',
    city: 'New York',
    timeZone: 'America/New_York',
    startOffsetHours: 5,
    durationHours: 2,
    capacity: 5,
    approvedParticipantCount: 2,
    estimatedCost: 8,
    currency: 'USD',
    hostName: 'Julian Brooks',
    meetingInstructions: 'Look for the long oak communal table by the sunlit front window.',
    whatToBring: 'Just yourself.',
  },
  {
    slug: 'nyc_board_games',
    title: 'Board games and good company',
    category: 'Games & Hobbies',
    description:
      'Bringing Catan, Wavelength, and Azul to a cozy neighborhood lounge. Beginners welcome — we teach rules quickly before round one.',
    coverImageURL: CURATED_COVER_IMAGES[3].url,
    venueName: 'Hex & Co Lounge',
    venueAddress: '2911 Broadway',
    city: 'New York',
    timeZone: 'America/New_York',
    startOffsetHours: 54,
    durationHours: 3,
    capacity: 6,
    approvedParticipantCount: 4,
    estimatedCost: 12,
    currency: 'USD',
    hostName: 'Sora Takahashi',
    meetingInstructions: 'Ask the front counter for the PlusOne reserved table.',
    whatToBring: 'Optional favorite quick card game.',
  },
  {
    slug: 'sf_coastal_hike',
    title: 'Weekend hiking crew',
    category: 'Outdoor Adventures',
    description:
      'Moderate 5-mile coastal ridge trail with sweeping ocean views at golden hour. Easy conversation pace with water breaks.',
    coverImageURL: CURATED_COVER_IMAGES[2].url,
    venueName: 'Lands End Trailhead',
    venueAddress: '680 Point Lobos Ave',
    city: 'San Francisco',
    timeZone: 'America/Los_Angeles',
    startOffsetHours: 48,
    durationHours: 3,
    capacity: 8,
    approvedParticipantCount: 4,
    estimatedCost: 0,
    currency: 'USD',
    hostName: 'Elena Ortiz',
    meetingInstructions: 'Meet outside the Visitor Center wooden benches 10 minutes early.',
    whatToBring: 'Water bottle, light windbreaker, and trail sneakers.',
  },
  {
    slug: 'sf_farmers_market',
    title: 'Sunday farmers market walk',
    category: 'Food & Dining',
    description:
      'Morning stroll through the artisan stalls for fresh flowers, sourdough, and seasonal espresso, followed by sitting by the bay.',
    coverImageURL: CURATED_COVER_IMAGES[4].url,
    venueName: 'Ferry Building Farmers Market',
    venueAddress: '1 Ferry Building',
    city: 'San Francisco',
    timeZone: 'America/Los_Angeles',
    startOffsetHours: 76,
    durationHours: 2,
    capacity: 6,
    approvedParticipantCount: 2,
    estimatedCost: 0,
    currency: 'USD',
    hostName: 'Noah Patel',
    meetingInstructions: 'Meet under the central clocktower archway facing the plaza.',
    whatToBring: 'Canvas tote bag and sunglasses.',
  },
  {
    slug: 'london_photo_walk',
    title: 'Sunset photography walk',
    category: 'Explore the City',
    description:
      'Bring any camera or phone for a slow 90-minute architectural & street walk ending at a public waterfront overlook.',
    coverImageURL: CURATED_COVER_IMAGES[0].url,
    venueName: 'Southbank Riverfront Walk',
    venueAddress: 'Belvedere Road',
    city: 'London',
    timeZone: 'Europe/London',
    startOffsetHours: 30,
    durationHours: 2,
    capacity: 7,
    approvedParticipantCount: 3,
    estimatedCost: 0,
    currency: 'GBP',
    hostName: 'Oliver Grant',
    meetingInstructions: 'Meet at the steps outside the main gallery bookshop.',
    whatToBring: 'Phone or camera.',
  },
  {
    slug: 'austin_barton_walk',
    title: 'Morning greenbelt trail & iced matcha',
    category: 'Fitness & Wellness',
    description:
      'Easy morning loop along Barton Creek followed by cold brew or matcha on South Congress. Great way to meet active folks without racing.',
    coverImageURL: CURATED_COVER_IMAGES[2].url,
    venueName: 'Zilker Trailhead Entrance',
    venueAddress: '2100 Barton Springs Rd',
    city: 'Austin',
    timeZone: 'America/Chicago',
    startOffsetHours: 22,
    durationHours: 2,
    capacity: 6,
    approvedParticipantCount: 2,
    estimatedCost: 7,
    currency: 'USD',
    hostName: 'Camila Reyes',
    meetingInstructions: 'Meet by the stone trail map kiosk beside the main pedestrian bridge.',
    whatToBring: 'Water bottle and comfortable sneakers.',
  },
  {
    slug: 'chicago_riverwalk_coffee',
    title: 'Architectural riverwalk & espresso',
    category: 'Explore the City',
    description:
      'Slow walk along the Chicago Riverwalk stopping to sketch or photograph historic bridges, ending at a riverside cafe.',
    coverImageURL: CURATED_COVER_IMAGES[1].url,
    venueName: 'Michigan Ave Bridge Plaza',
    venueAddress: '400 N Michigan Ave',
    city: 'Chicago',
    timeZone: 'America/Chicago',
    startOffsetHours: 38,
    durationHours: 2,
    capacity: 6,
    approvedParticipantCount: 3,
    estimatedCost: 6,
    currency: 'USD',
    hostName: 'Devon Kim',
    meetingInstructions: 'Gather near the southeast riverwalk staircase overlooking the water.',
    whatToBring: 'Light jacket and phone or notebook.',
  },
  {
    slug: 'seattle_pike_market',
    title: 'Roastery tasting & waterfront stroll',
    category: 'Coffee & Conversations',
    description:
      'Exploring small-batch coffee near Pike Place and walking down to the Olympic Sculpture Park pier. Welcoming to solo attendees.',
    coverImageURL: CURATED_COVER_IMAGES[4].url,
    venueName: 'Victor Steinbrueck Park',
    venueAddress: '2001 Western Ave',
    city: 'Seattle',
    timeZone: 'America/Los_Angeles',
    startOffsetHours: 60,
    durationHours: 2,
    capacity: 5,
    approvedParticipantCount: 2,
    estimatedCost: 10,
    currency: 'USD',
    hostName: 'Hannah Park',
    meetingInstructions: 'Meet by the north park benches overlooking Elliott Bay.',
    whatToBring: 'Rain shell just in case.',
  },
  {
    slug: 'la_indie_cinema',
    title: 'Repertory film matinee & cafe debrief',
    category: 'Movies & Entertainment',
    description:
      'Catching a classic 35mm afternoon screening and walking two blocks afterward to talk cinema over espresso or gelato.',
    coverImageURL: CURATED_COVER_IMAGES[0].url,
    venueName: 'Vista Plaza Forecourt',
    venueAddress: '4473 Sunset Drive',
    city: 'Los Angeles',
    timeZone: 'America/Los_Angeles',
    startOffsetHours: 50,
    durationHours: 3,
    capacity: 6,
    approvedParticipantCount: 3,
    estimatedCost: 16,
    currency: 'USD',
    hostName: 'Lucas Vega',
    meetingInstructions: 'Meet outside under the neon marquee 15 minutes before showtime.',
    whatToBring: 'Cinema ticket.',
  },
  {
    slug: 'boston_charles_founders',
    title: 'Creative founders coffee & book swap',
    category: 'Networking',
    description:
      'Low-key Saturday table for designers, builders, and writers. Bring one book you loved this year or just come say hello.',
    coverImageURL: CURATED_COVER_IMAGES[1].url,
    venueName: 'Tatte Bakery Courtyard',
    venueAddress: '318 Third Street',
    city: 'Boston',
    timeZone: 'America/New_York',
    startOffsetHours: 44,
    durationHours: 2,
    capacity: 6,
    approvedParticipantCount: 3,
    estimatedCost: 9,
    currency: 'USD',
    hostName: 'Priya Nair',
    meetingInstructions: 'Look for the round table near the glass pastry counter.',
    whatToBring: 'Optional favorite paperback to swap.',
  },
  {
    slug: 'toronto_kensington_food',
    title: 'Kensington Market tasting stroll',
    category: 'Food & Dining',
    description:
      'Casual afternoon walk tasting empanadas, pastries, and fresh juice through Kensington Market before relaxing in Bellevue Square.',
    coverImageURL: CURATED_COVER_IMAGES[4].url,
    venueName: 'Bellevue Square Park',
    venueAddress: '35 Bellevue Ave',
    city: 'Toronto',
    timeZone: 'America/Toronto',
    startOffsetHours: 70,
    durationHours: 2,
    capacity: 7,
    approvedParticipantCount: 3,
    estimatedCost: 15,
    currency: 'CAD',
    hostName: 'Liam Fraser',
    meetingInstructions: 'Meet beside the central fountain pavilion inside the park.',
    whatToBring: 'Comfortable walking shoes.',
  },
  {
    slug: 'berlin_tempelhof_spontaneous',
    title: 'Golden hour park games & sunset hangout',
    category: 'Something Spontaneous',
    description:
      'Easygoing late-afternoon meetup on the open lawn with spikeball, card games, and music as the sun drops over the runway.',
    coverImageURL: CURATED_COVER_IMAGES[3].url,
    venueName: 'Tempelhofer Feld Main Gate',
    venueAddress: 'Tempelhofer Damm 45',
    city: 'Berlin',
    timeZone: 'Europe/Berlin',
    startOffsetHours: 28,
    durationHours: 3,
    capacity: 8,
    approvedParticipantCount: 4,
    estimatedCost: 0,
    currency: 'EUR',
    hostName: 'Klara Weber',
    meetingInstructions: 'Meet right inside the Columbiadamm main bicycle entrance.',
    whatToBring: 'Picnic blanket or favorite drink.',
  },
];

function buildPreviewActivity(template: DemoActivityTemplate, baseMs: number): Activity {
  const startMs = baseMs + template.startOffsetHours * 3600 * 1000;
  const endMs = startMs + template.durationHours * 3600 * 1000;
  return {
    activityId: `demo_preview_${template.slug}`,
    hostId: `demo_host_${template.slug}`,
    hostName: template.hostName,
    title: template.title,
    description: template.description,
    category: template.category,
    coverImageURL: template.coverImageURL,
    venueName: template.venueName,
    venueAddress: template.venueAddress,
    city: template.city,
    startAt: Timestamp.fromMillis(startMs),
    endAt: Timestamp.fromMillis(endMs),
    timeZone: template.timeZone,
    capacity: template.capacity,
    approvedParticipantCount: template.approvedParticipantCount,
    estimatedCost: template.estimatedCost,
    currency: template.currency,
    status: 'published',
    isDemo: true,
    createdAt: Timestamp.fromMillis(baseMs - 3600 * 1000),
    updatedAt: Timestamp.fromMillis(baseMs - 3600 * 1000),
  };
}

// Stable anchor rounded to the current hour so dates stay fresh & deterministic per session
function getAnchorHourMs(): number {
  const hour = 3600 * 1000;
  return Math.ceil(Date.now() / hour) * hour;
}

export function isLocalDemoPreviewId(activityId?: string): boolean {
  return Boolean(activityId && activityId.startsWith('demo_preview_'));
}

export function getBuiltInDemoPreviews(extraCity?: string): Activity[] {
  const baseMs = getAnchorHourMs();
  const list = DEMO_ACTIVITY_TEMPLATES.map((t) => buildPreviewActivity(t, baseMs));

  const trimmedCity = extraCity?.trim();
  if (
    trimmedCity &&
    !list.some((a) => a.city.toLowerCase() === trimmedCity.toLowerCase())
  ) {
    const slugCity = encodeURIComponent(trimmedCity.toLowerCase().replace(/\s+/g, '_'));
    list.push({
      activityId: `demo_preview_local_${slugCity}`,
      hostId: 'demo_host_local_city',
      hostName: 'Alex Rivera',
      title: `Neighborhood coffee & city walk in ${trimmedCity}`,
      description: `An open coffee table and casual afternoon walk around ${trimmedCity}. Built to help newcomers and locals meet over something easy and public.`,
      category: 'Coffee & Conversations',
      coverImageURL: CURATED_COVER_IMAGES[1].url,
      venueName: `${trimmedCity} Central Roastery`,
      venueAddress: 'Main Civic Plaza',
      city: trimmedCity,
      startAt: Timestamp.fromMillis(baseMs + 24 * 3600 * 1000),
      endAt: Timestamp.fromMillis(baseMs + 26 * 3600 * 1000),
      timeZone: 'UTC',
      capacity: 6,
      approvedParticipantCount: 2,
      estimatedCost: 8,
      currency: 'USD',
      status: 'published',
      isDemo: true,
      createdAt: Timestamp.fromMillis(baseMs - 3600 * 1000),
      updatedAt: Timestamp.fromMillis(baseMs - 3600 * 1000),
    });
  }

  return list;
}

export function getDemoPreviewById(
  activityId: string,
  extraCity?: string
): {
  activity: Activity;
  privateDetails: ActivityPrivateDetails;
  roster: ActivityRoster;
} | null {
  const baseMs = getAnchorHourMs();
  const tpl = DEMO_ACTIVITY_TEMPLATES.find(
    (t) => `demo_preview_${t.slug}` === activityId
  );

  if (tpl) {
    const activity = buildPreviewActivity(tpl, baseMs);
    return {
      activity,
      privateDetails: {
        activityId: activity.activityId,
        hostId: activity.hostId,
        meetingInstructions: tpl.meetingInstructions,
        whatToBring: tpl.whatToBring,
        updatedAt: activity.updatedAt,
      },
      roster: {
        activityId: activity.activityId,
        hostId: activity.hostId,
        previews: [
          {
            uid: activity.hostId,
            displayName: tpl.hostName,
            role: 'host',
          },
        ],
        updatedAt: activity.updatedAt,
      },
    };
  }

  if (activityId.startsWith('demo_preview_local_')) {
    const localMatch = getBuiltInDemoPreviews(extraCity).find(
      (a) => a.activityId === activityId
    );
    if (localMatch) {
      return {
        activity: localMatch,
        privateDetails: {
          activityId: localMatch.activityId,
          hostId: localMatch.hostId,
          meetingInstructions:
            'Demo preview instructions: look for the sunlit corner table near the main entrance.',
          whatToBring: 'Just yourself.',
          updatedAt: localMatch.updatedAt,
        },
        roster: {
          activityId: localMatch.activityId,
          hostId: localMatch.hostId,
          previews: [
            {
              uid: localMatch.hostId,
              displayName: localMatch.hostName,
              role: 'host',
            },
          ],
          updatedAt: localMatch.updatedAt,
        },
      };
    }
  }

  return null;
}
