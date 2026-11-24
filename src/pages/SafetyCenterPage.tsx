import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, MapPin, Flag, UserX, Lock } from 'lucide-react';
import { BrandLogo } from '@/src/components/BrandLogo';
import { useAuth } from '@/src/context/AuthContext';

export function SafetyCenterPage() {
  const { firebaseUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#080808]">
      <header className="border-b border-[#E5E3DD] bg-[#F8F6F0]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to={firebaseUser ? '/discover' : '/'}>
            <BrandLogo variant="dark" size="md" />
          </Link>
          <Link
            to={firebaseUser ? '/discover' : '/'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#747474] hover:text-[#080808] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {firebaseUser ? 'Back to Discover' : 'Back to home'}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-14 space-y-16">
        <section className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#747474]">
            Safety Center
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.06] text-balance">
            New people. Comfortable beginnings.
          </h1>
          <p className="text-base text-[#747474] leading-relaxed max-w-2xl">
            PlusOne is built to help adults connect around real-world plans. While no
            platform can guarantee behavior offline, we design every flow to prioritize
            public spaces, consent, and clear boundaries.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
          {[
            {
              icon: MapPin,
              title: 'Always meet in public places',
              text: 'Activities require a public venue name and street address—cafes, museums, parks, or trails. Never share private home addresses.',
            },
            {
              icon: ShieldCheck,
              title: 'Tell someone you trust',
              text: 'Before heading to a plan, let a friend or family member know where you are going, who you are meeting, and when you expect to return.',
            },
            {
              icon: Flag,
              title: 'Report anything concerning',
              text: 'Every activity, profile, and group chat message includes a private Report button reviewed by PlusOne moderators.',
            },
            {
              icon: UserX,
              title: 'Block & withdraw anytime',
              text: 'You can withdraw a join request, leave an activity, or block a user from your profile settings at any moment.',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="border-t border-[#080808] pt-5 space-y-2.5"
              >
                <Icon className="w-5 h-5 text-[#080808]" strokeWidth={1.6} />
                <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">
                  {card.title}
                </h2>
                <p className="text-sm text-[#747474] leading-relaxed">{card.text}</p>
              </div>
            );
          })}
        </section>

        <section id="guidelines" className="bg-white border border-[#E5E3DD] rounded-[24px] p-7 sm:p-9 space-y-4">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
            Community Guidelines
          </h2>
          <ul className="space-y-3 text-sm text-[#747474] list-disc pl-5 leading-relaxed">
            <li>
              <strong className="text-[#080808]">Adults 18+ only:</strong> Every member
              must confirm they are at least 18 years old.
            </li>
            <li>
              <strong className="text-[#080808]">Activity-first, never dating:</strong>{' '}
              PlusOne is for shared plans and friendships. Romantic solicitation,
              unwanted advances, or harassment are not permitted.
            </li>
            <li>
              <strong className="text-[#080808]">Show up or communicate early:</strong>{' '}
              Small groups rely on people following through. Leave a plan early if your
              schedule changes so someone else can take the spot.
            </li>
            <li>
              <strong className="text-[#080808]">No commercial spam:</strong> Do not use
              activities to pitch MLM schemes, unapproved ticket resales, or promotions.
            </li>
          </ul>
        </section>

        <section id="about" className="space-y-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight">About PlusOne.</h2>
          <p className="text-sm text-[#747474] leading-relaxed">
            PlusOne started with a simple observation: people cancel more good plans
            for lack of company than lack of interest. By matching people around what
            they want to do—not endless profile swiping—PlusOne turns solo intentions
            into shared offline memories.
          </p>
        </section>

        <section id="privacy" className="bg-white border border-[#E5E3DD] rounded-[24px] p-7 sm:p-9 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#080808]" />
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Privacy Policy &amp; Data Protection
            </h2>
          </div>
          <p className="text-sm text-[#747474] leading-relaxed">
            Your email address, notification settings, and block list are stored in a
            strictly owner-private database collection and are never exposed to other
            members. Exact meeting instructions and group chats are accessible only to the
            host and approved participants of that activity. Post-activity feedback is
            private and never published without consent.
          </p>
        </section>

        <section id="terms" className="space-y-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Terms of Use</h2>
          <p className="text-sm text-[#747474] leading-relaxed">
            By using PlusOne, you confirm that you are 18 years or older, agree to meet
            only at public venues, and take personal responsibility for your real-world
            attendance. PlusOne does not conduct background checks or government ID
            verification unless explicitly stated.
          </p>
        </section>

        <section id="contact" className="border-t border-[#E5E3DD] pt-8 text-sm text-[#747474]">
          <h2 className="font-display text-lg font-semibold text-[#080808] mb-1">
            Contact &amp; Support
          </h2>
          <p>
            Questions, safety escalations, or feedback? Reach the PlusOne team at{' '}
            <span className="font-medium text-[#080808]">safety@plusone.app</span> or
            use the in-app Report controls.
          </p>
        </section>
      </main>
    </div>
  );
}
