import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '@/src/components/BrandLogo';
import { EditorialImage } from '@/src/components/EditorialImage';
import { ActivityCard } from '@/src/components/ActivityCard';
import { ActivityCardSkeleton } from '@/src/components/Skeletons';
import { EmptyState } from '@/src/components/EmptyState';
import { getBuiltInDemoPreviews } from '@/src/constants/demoData';
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CURATED_COVER_IMAGES,
} from '@/src/constants/plusone';
import { isPastActivity } from '@/src/lib/date';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { Activity } from '@/src/types/plusone';

export function LandingPage() {
  const { firebaseUser, publicProfile } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Activity[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const isSignedIn = Boolean(firebaseUser && firebaseUser.emailVerified);

  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      where('status', '==', 'published')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const live = snap.docs
          .map((d) => d.data() as Activity)
          .filter((a) => !isPastActivity(a.endAt));

        const seededDemoCities = new Set(
          live.filter((a) => a.isDemo).map((a) => a.city.trim().toLowerCase())
        );
        const previews = getBuiltInDemoPreviews().filter(
          (p) =>
            !seededDemoCities.has(p.city.trim().toLowerCase()) &&
            !live.some(
              (l) =>
                l.title.trim().toLowerCase() === p.title.trim().toLowerCase() &&
                l.city.trim().toLowerCase() === p.city.trim().toLowerCase()
            )
        );

        const list = [...live, ...previews]
          .sort((a, b) => {
            if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
            return a.startAt.toMillis() - b.startAt.toMillis();
          })
          .slice(0, 6);

        setFeatured(list);
        setLoadingFeatured(false);
      },
      () => {
        setFeatured(getBuiltInDemoPreviews().slice(0, 6));
        setLoadingFeatured(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#080808]">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#F8F6F0]/90 backdrop-blur-md border-b border-[#E5E3DD]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          <Link to="/" aria-label="PlusOne home">
            <BrandLogo variant="dark" size="md" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-9 text-sm font-medium text-[#747474]"
          >
            <a
              href="#featured"
              className="hover:text-[#080808] transition-colors whitespace-nowrap shrink-0"
            >
              Discover
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#080808] transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
            <a
              href="#safety"
              className="hover:text-[#080808] transition-colors whitespace-nowrap shrink-0"
            >
              Safety
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {isSignedIn ? (
              <Link
                to={publicProfile?.onboardingCompleted ? '/discover' : '/onboarding'}
                className="rounded-full bg-[#080808] text-[#F8F6F0] px-5 py-2 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  to="/auth?mode=login"
                  className="text-sm font-medium text-[#080808] hover:underline underline-offset-4 px-2.5 py-1.5 whitespace-nowrap shrink-0"
                >
                  Log in
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="rounded-full bg-[#080808] text-[#F8F6F0] px-5 py-2 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Editorial Hero */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-6"
            >
              <p className="text-xs font-medium tracking-[0.04em] uppercase text-[#747474]">
                Find your people. Go somewhere.
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-[-0.035em] text-[#080808] leading-[0.96] text-balance">
                Good plans.
                <br />
                Better company.
              </h1>
              <p className="text-base sm:text-lg text-[#747474] leading-relaxed max-w-lg">
                From spontaneous coffee runs to weekend adventures, find people who
                want to do the same things you do.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={isSignedIn ? '/discover' : '/auth?mode=signup'}
                  className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-7 py-3.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  Find your next plan
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={isSignedIn ? '/create' : '/auth?mode=signup'}
                  className="inline-flex items-center rounded-full border border-[#E5E3DD] bg-white text-[#080808] px-7 py-3.5 text-sm font-medium hover:bg-[#F0EEE8] hover:border-[#080808]/30 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  Create a plan
                </Link>
              </div>
              <p className="text-xs text-[#747474] pt-2 border-t border-[#E5E3DD] max-w-md">
                Activity-first discovery for adults 18+ · Public meeting venues · Not a dating app
              </p>
            </motion.div>

            {/* Asymmetric Editorial Magazine Collage */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 grid grid-cols-12 gap-3 sm:gap-4 items-start"
            >
              <div className="col-span-7 space-y-3 sm:space-y-4">
                <div className="aspect-[4/5] rounded-[20px] overflow-hidden border border-[#E5E3DD] bg-[#F0EEE8] group">
                  <EditorialImage
                    src={CURATED_COVER_IMAGES[0].url}
                    alt="Friends exploring a contemporary art museum together"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="aspect-[16/10] rounded-[20px] overflow-hidden border border-[#E5E3DD] bg-[#F0EEE8] group">
                  <EditorialImage
                    src={CURATED_COVER_IMAGES[3].url}
                    alt="Small group playing a wooden strategy board game at a cafe"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="col-span-5 space-y-3 sm:space-y-4 pt-6 sm:pt-10">
                <div className="aspect-[4/3] rounded-[20px] overflow-hidden border border-[#E5E3DD] bg-[#F0EEE8] group">
                  <EditorialImage
                    src={CURATED_COVER_IMAGES[1].url}
                    alt="Morning coffee conversation at a sunny neighborhood cafe"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="aspect-[4/5] rounded-[20px] overflow-hidden border border-[#E5E3DD] bg-[#F0EEE8] group">
                  <EditorialImage
                    src={CURATED_COVER_IMAGES[2].url}
                    alt="Weekend hiking group walking a coastal ridge trail at sunset"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Broadsheet Manifesto / Problem Statement */}
        <section className="bg-[#080808] text-[#F8F6F0] py-24 lg:py-32">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 space-y-10">
            <div className="space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#F8F6F0]/55">
                Why PlusOne exists
              </p>
              <h2 className="font-display text-3xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-[-0.03em] leading-[1.05] text-balance">
                How many plans have you cancelled because you had nobody to go with?
              </h2>
              <p className="text-base sm:text-lg text-[#F8F6F0]/75 leading-relaxed max-w-2xl">
                Somewhere nearby, someone wants to do exactly what you want to do.
                PlusOne brings you together around real places and shared timing.
              </p>
            </div>
            <div className="pt-8 border-t border-white/15 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <p className="font-display text-lg sm:text-2xl font-medium tracking-[-0.015em] text-[#F8F6F0] max-w-2xl text-balance">
                “Don&apos;t match people based on who they are. Match them based on what they want to do.”
              </p>
              <span className="text-xs text-[#F8F6F0]/60 whitespace-nowrap">
                Life is better with a PlusOne.
              </span>
            </div>
          </div>
        </section>

        {/* How it works — Architectural Hairline Index */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-2.5">
              How it works
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.1] text-balance">
              Built to get you out the door, not scrolling.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            {[
              {
                step: '01',
                title: 'Find something you love.',
                body: 'Discover activities happening around you — from museum mornings and gallery walks to coffee runs and coastal trails.',
              },
              {
                step: '02',
                title: 'Find your people.',
                body: 'Request to join a small group or create your own plan. Hosts review every request to keep the group comfortable.',
              },
              {
                step: '03',
                title: 'Actually go.',
                body: 'Once approved, unlock the exact meeting spot and group chat, meet in a public place, and make real-world memories.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="border-t border-[#080808] pt-6 flex flex-col justify-between gap-6"
              >
                <span className="font-display text-sm font-semibold tabular-nums text-[#747474]">
                  {item.step}
                </span>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#747474] leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Activities from Firestore */}
        <section id="featured" className="max-w-7xl mx-auto px-5 sm:px-8 py-12 lg:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-10 border-b border-[#E5E3DD]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-2">
                Live plans
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
                Featured activities
              </h2>
            </div>
            <Link
              to={isSignedIn ? '/discover' : '/auth?mode=signup'}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#080808] hover:underline underline-offset-4 whitespace-nowrap"
            >
              Browse all plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ActivityCardSkeleton />
              <ActivityCardSkeleton />
              <ActivityCardSkeleton />
            </div>
          ) : featured.length > 0 ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((act) => (
                  <ActivityCard key={act.activityId} activity={act} showSave={isSignedIn} />
                ))}
              </div>
              {featured.some((a) => a.isDemo) && (
                <p className="text-xs text-[#747474]">
                  Items tagged <span className="font-medium text-[#080808]">Demo preview</span> are sample showcase listings and are excluded from real pilot metrics.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No live activities published yet"
              description="Be the first to put a real plan on the calendar — grab coffee, visit a museum, or organize a weekend walk."
              actionLabel={isSignedIn ? 'Create the first plan' : 'Get started to host'}
              onAction={() => {
                navigate(isSignedIn ? '/create' : '/auth?mode=signup');
              }}
            />
          )}
        </section>

        {/* Categories — Hairline Editorial Index */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <div className="mb-10 max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474] mb-2">
              Ways to connect
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">
              Ten ways to say yes to the weekend.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-l border-[#E5E3DD] bg-white rounded-[20px] overflow-hidden">
            {ACTIVITY_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={
                  isSignedIn
                    ? `/explore?category=${encodeURIComponent(cat)}`
                    : '/auth?mode=signup'
                }
                className="group border-r border-b border-[#E5E3DD] p-6 hover:bg-[#F8F6F0] transition-colors flex flex-col justify-between gap-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold tracking-[-0.015em] text-[#080808]">
                    {cat}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-[#747474] group-hover:text-[#080808] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-[#747474] leading-relaxed">
                  {CATEGORY_DESCRIPTIONS[cat]}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Safety Section — Editorial Typography Grid */}
        <section id="safety" className="bg-white border-y border-[#E5E3DD] py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474]">
                Safety &amp; trust
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.08] text-balance">
                New people. Comfortable beginnings.
              </h2>
              <p className="text-sm sm:text-base text-[#747474] leading-relaxed">
                Meeting someone new should feel clear, voluntary, and grounded in
                public spaces. PlusOne gives you practical tools before, during,
                and after every meetup.
              </p>
              <Link
                to="/safety"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#080808] hover:underline underline-offset-4 pt-2"
              >
                Read the Safety Center
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
              {[
                {
                  icon: MapPin,
                  title: 'Public meeting venues',
                  text: 'Every activity lists a public venue and city. Exact meetup instructions stay hidden until a host approves your request.',
                },
                {
                  icon: Users,
                  title: 'Host approval & small groups',
                  text: 'No open free-for-alls. Hosts review join requests, manage group size, and can remove participants if needed.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Reporting & user blocking',
                  text: 'Report any activity, message, or member directly in-app. Blocked users are immediately hidden from your discovery feed.',
                },
                {
                  icon: Calendar,
                  title: 'Clear community standards',
                  text: 'PlusOne is strictly for adults 18+ and prohibits dating pressure, solicitation, or private home invitations.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="border-t border-[#E5E3DD] pt-5 space-y-2.5"
                  >
                    <Icon className="w-5 h-5 text-[#080808]" strokeWidth={1.6} />
                    <h3 className="font-display text-base font-semibold tracking-[-0.015em]">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#747474] leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto px-5 sm:px-8 py-24 lg:py-32 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.06] text-balance">
            Your next favorite memory starts with a PlusOne.
          </h2>
          <p className="text-sm sm:text-base text-[#747474] max-w-lg mx-auto leading-relaxed">
            Join an activity already on the calendar or publish a plan you have been
            putting off.
          </p>
          <div className="pt-2">
            <Link
              to={isSignedIn ? '/discover' : '/auth?mode=signup'}
              className="inline-flex items-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-8 py-3.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all"
            >
              Let&apos;s go
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E5E3DD] bg-[#F8F6F0] py-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <BrandLogo variant="dark" size="sm" />
            <p className="text-xs text-[#747474]">
              Find your people. Go somewhere. · © {new Date().getFullYear()} PlusOne.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[#747474]"
          >
            <Link to="/safety#about" className="hover:text-[#080808] transition-colors">
              About
            </Link>
            <Link
              to="/safety#guidelines"
              className="hover:text-[#080808] transition-colors"
            >
              Community Guidelines
            </Link>
            <Link to="/safety" className="hover:text-[#080808] transition-colors">
              Safety
            </Link>
            <Link
              to="/safety#privacy"
              className="hover:text-[#080808] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link to="/safety#terms" className="hover:text-[#080808] transition-colors">
              Terms
            </Link>
            <Link
              to="/safety#contact"
              className="hover:text-[#080808] transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
