import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Rahul Sharma',
    rank: 'AIR 234 - JEE Advanced 2025',
    image: '/testimonials/student1.jpg',
    content: 'SaviEduTech transformed my preparation journey. The video lectures by Dharmendra Sir made Physics so much easier to understand. The daily practice problems kept me on track.',
    rating: 5,
  },
  {
    name: 'Priya Patel',
    rank: 'AIR 567 - NEET 2025',
    image: '/testimonials/student2.jpg',
    content: 'The faculty here is exceptional. Harendra Sir\'s Organic Chemistry lectures are the best I\'ve ever attended. The mock tests helped me improve my time management significantly.',
    rating: 5,
  },
  {
    name: 'Amit Kumar',
    rank: 'AIR 890 - JEE Main 2025',
    image: '/testimonials/student3.jpg',
    content: 'I loved the personalized revision recommendations. The system identified my weak areas in Mathematics and helped me improve dramatically. Highly recommended!',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Success Stories
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Hear from students who achieved their dreams with SaviEduTech
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-slate-800 rounded-2xl p-6 relative"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-slate-700" />
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xl font-bold">
                  {testimonial.name[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{testimonial.name}</h4>
                  <p className="text-sm text-primary-400">{testimonial.rank}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}