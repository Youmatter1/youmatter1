'use client';

import { useState } from 'react';
import { ChevronDown, Heart, Users, Zap, Quote, CheckCircle, MessageCircle, Lock, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/auth-modal';

const therapists = [
  {
    id: 1,
    name: 'Dr. Amara Okonkwo',
    title: 'Clinical Psychologist',
    specialty: 'Anxiety & Depression',
    rating: 4.9,
    reviews: 128,
    price: 80,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    badge: 'Verified',
  },
  {
    id: 2,
    name: 'Dr. Kwame Mensah',
    title: 'Licensed Therapist',
    specialty: 'Relationships & Trauma',
    rating: 4.8,
    reviews: 95,
    price: 75,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    badge: 'Verified',
  },
  {
    id: 3,
    name: 'Zainab Hassan',
    title: 'Counselor',
    specialty: 'Life Transitions',
    rating: 4.9,
    reviews: 156,
    price: 70,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    badge: 'Verified',
  },
];

const testimonials = [
  {
    name: 'Chioma O.',
    location: 'Lagos, Nigeria',
    text: 'You Matter changed my life. I found a therapist who truly understood my challenges. The process was so easy and confidential.',
    rating: 5,
  },
  {
    name: 'David N.',
    location: 'Kampala, Uganda',
    text: 'Finally, quality mental health support that feels human, not clinical. The app is so calming, and my therapist is amazing.',
    rating: 5,
  },
  {
    name: 'Asha M.',
    location: 'Nairobi, Kenya',
    text: 'I was scared to seek therapy, but You Matter made it safe and comfortable. Highly recommend for anyone hesitating.',
    rating: 5,
  },
];

const faqs = [
  {
    question: 'Is my information confidential?',
    answer: 'Yes. All conversations are encrypted end-to-end. We comply with international privacy standards and never share your data with third parties.',
  },
  {
    question: 'How do I know if a therapist is right for me?',
    answer: 'You can view detailed profiles, read patient reviews, and book a free 15-minute consultation before committing to sessions.',
  },
  {
    question: 'What if I have a mental health crisis?',
    answer: 'We have emergency resources and crisis hotlines available 24/7. A crisis button is visible on every page for immediate support.',
  },
  {
    question: 'How much does therapy cost?',
    answer: 'Session prices vary by therapist (typically $50-$150). We offer flexible payment plans and some sessions may be covered by insurance.',
  },
  {
    question: 'Can I do therapy via video, chat, or phone?',
    answer: 'Yes! You can choose your preferred method. Most therapists offer multiple formats for your convenience.',
  },
  {
    question: 'Do you work with insurance?',
    answer: 'Many of our therapists accept insurance. Filter by insurance provider when searching for a therapist.',
  },
];

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-blue-50 flex items-center justify-center shadow-sm">
        <span className="text-2xl font-bold text-green-700">{number}</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function TherapistCard({ therapist, onAuthRequired }: { therapist: (typeof therapists)[0]; onAuthRequired: () => void }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative h-48 bg-gradient-to-br from-green-100 to-blue-50 overflow-hidden">
        <img src={therapist.image} alt={therapist.name} className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
          {therapist.badge}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{therapist.name}</h3>
        <p className="text-sm text-green-700 font-medium mb-3">{therapist.title}</p>
        <p className="text-xs text-gray-600 mb-4">{therapist.specialty}</p>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-gray-900">{therapist.rating}</span>
            <span className="text-lg">⭐</span>
            <span className="text-xs text-gray-600">({therapist.reviews})</span>
          </div>
          <div className="text-lg font-bold text-green-700">${therapist.price}</div>
        </div>

        <Button
          onClick={onAuthRequired}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold h-10"
        >
          Book a Session
        </Button>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: (typeof testimonials)[0] }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-8 relative shadow-sm hover:shadow-md transition-shadow">
      <Quote className="absolute top-4 right-4 w-6 h-6 text-green-200" />
      <div className="flex items-center gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <span key={i} className="text-lg">⭐</span>
        ))}
      </div>
      <p className="text-gray-700 mb-6 leading-relaxed text-sm italic">"{testimonial.text}"</p>
      <div>
        <p className="font-semibold text-gray-900">{testimonial.name}</p>
        <p className="text-xs text-gray-600">{testimonial.location}</p>
      </div>
    </div>
  );
}

function FAQItem({ item, isOpen, onToggle }: { item: (typeof faqs)[0]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-6 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <span className="font-semibold text-gray-900">{item.question}</span>
        <ChevronDown
          className={`w-5 h-5 text-green-600 flex-shrink-0 ml-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-gray-700 text-sm leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [preSelectedRole, setPreSelectedRole] = useState<'patient' | 'therapist' | 'org_admin' | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-blue-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">You Matter</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link href="/patient/find-therapist">
              <Button variant="secondary" className="rounded-lg text-sm">
                Find Therapist
              </Button>
            </Link>
            <Link
              href="/login"
              className="text-gray-700 hover:text-gray-900 text-sm font-semibold px-3 py-2 transition-colors"
            >
              Login
            </Link>
            <button
              onClick={() => {
                setPreSelectedRole('patient');
                setAuthModalOpen(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm px-5 py-2 font-semibold transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => {
                setPreSelectedRole('therapist');
                setAuthModalOpen(true);
              }}
              className="border border-green-600 text-green-700 hover:bg-green-50 rounded-lg text-sm px-5 py-2 font-semibold transition-colors"
            >
              I'm a Professional
            </button>
            <button
              onClick={() => {
                setPreSelectedRole('org_admin');
                setAuthModalOpen(true);
              }}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm px-5 py-2 font-semibold transition-colors"
            >
              For Organizations
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-gray-50 to-green-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                You Don't Have to Heal Alone.
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Connect with licensed mental health professionals anytime, anywhere. Safe, confidential, and on your terms.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/patient/find-therapist" className="flex-1 sm:flex-none">
                  <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 h-12 rounded-xl font-semibold text-base">
                    Find a Therapist
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    setPreSelectedRole('therapist');
                    setAuthModalOpen(true);
                  }}
                  variant="secondary"
                  className="flex-1 sm:flex-none w-full sm:w-auto border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 h-12 rounded-xl font-semibold text-base"
                >
                  I'm a Professional
                </Button>
              </div>

              <div className="mt-12 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">500+ Licensed Therapists</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">100% Confidential</span>
                </div>
              </div>
            </div>

          <div className="relative h-96 bg-gradient-to-br from-green-200 to-green-300 rounded-3xl shadow-lg overflow-hidden flex items-center justify-center">
    <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 to-green-200/20 backdrop-blur-sm">
        <img src="https://images.pond5.com/black-family-embrace-group-south-footage-217783381_iconl.jpeg" alt="Therapy Session" className="w-full h-full object-cover rounded-3xl"/>
    </div>
</div>

          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get started in 3 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <StepCard
            number={1}
            title="Create Account"
            description="Sign up in 2 minutes. Tell us about your needs and preferences."
          />
          <StepCard
            number={2}
            title="Choose Your Therapist"
            description="Browse verified professionals and find someone who fits your needs."
          />
          <StepCard
            number={3}
            title="Start Your Journey"
            description="Book a session and begin your healing journey whenever you're ready."
          />
        </div>
      </section>

      {/* Featured Therapists */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Therapists</h2>
            <p className="text-lg text-gray-600">Highly-rated professionals ready to support you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {therapists.map((therapist) => (
              <TherapistCard
                key={therapist.id}
                therapist={therapist}
                onAuthRequired={() => {
                  setPreSelectedRole('patient');
                  setAuthModalOpen(true);
                }}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/patient/find-therapist">
              <Button className="bg-green-600 hover:bg-green-700 text-white px-8 h-12 rounded-xl font-semibold">
                View All Therapists
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Real Stories</h2>
          <p className="text-lg text-gray-600">Hear from people who've taken the first step</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <TestimonialCard key={idx} testimonial={testimonial} />
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">Why Choose You Matter?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                title: 'Your Privacy Matters',
                description: 'End-to-end encryption. Your conversations are completely confidential.',
              },
              {
                icon: Users,
                title: 'Licensed Professionals',
                description: 'Every therapist is verified and holds valid credentials.',
              },
              {
                icon: Zap,
                title: 'Fast & Easy',
                description: 'Book sessions in minutes. Start therapy this week.',
              },
              {
                icon: Heart,
                title: 'Affordable & Flexible',
                description: 'Flexible pricing and payment options to fit your budget.',
              },
              {
                icon: MessageCircle,
                title: 'Multiple Formats',
                description: 'Video, chat, or phone sessions—whatever works for you.',
              },
              {
                icon: Phone,
                title: 'Crisis Support',
                description: '24/7 emergency hotlines and crisis resources.',
              },
            ].map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} className="text-center">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Icon className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-600">Everything you need to know</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {faqs.map((faq, idx) => (
            <FAQItem
              key={idx}
              item={faq}
              isOpen={openFAQ === idx}
              onToggle={() => setOpenFAQ(openFAQ === idx ? null : idx)}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Take the First Step?</h2>
          <p className="text-lg text-green-100 mb-8">Connect with a licensed therapist today. Your journey to wellness starts here.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setPreSelectedRole("patient");
                setAuthModalOpen(true);
              }}
              className="w-full sm:w-auto bg-white text-green-600 hover:bg-gray-50 px-8 h-12 rounded-xl font-semibold transition-colors"
            >
              Get Started Free
            </button>
            <Link href="/patient/find-therapist">
              <Button
                variant="secondary"
                className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 px-8 h-12 rounded-xl font-semibold"
              >
                Browse Therapists
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-blue-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">You Matter</span>
              </div>
              <p className="text-sm text-gray-400">Connecting you with mental health support, one conversation at a time.</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition">
                    Crisis Hotline
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Emergency</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+1-800-273-8255</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>help@youmatter.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; 2026 You Matter. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition">
                Twitter
              </Link>
              <Link href="#" className="hover:text-white transition">
                LinkedIn
              </Link>
              <Link href="#" className="hover:text-white transition">
                Instagram
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        preSelectedRole={preSelectedRole}
      />
    </div>
  );
}
