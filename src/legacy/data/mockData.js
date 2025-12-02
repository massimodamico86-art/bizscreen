// Mock Data
export const mockData = {
  listings: [
    {
      id: '1',
      name: 'Luxury Beach House',
      address: '123 Ocean Drive, Miami Beach, FL',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
      active: true,
      bedrooms: 4,
      bathrooms: 3,
      guests: 8,
      price: 450,
      rating: 4.8,
      reviews: 124,
      tvs: 2,
      amenities: ['WiFi', 'Pool', 'Beach Access', 'Parking', 'Kitchen', 'Smart TV'],
      description: 'Stunning beachfront property with panoramic ocean views',
      carouselImages: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
      ],
      tvLayout: 'layout1',
      backgroundImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=3840',
      backgroundVideo: '',
      backgroundMusic: '',
      logo: '',
      language: 'English',
      wifiNetwork: 'Beach House WiFi',
      wifiPassword: 'welcome123',
      checkInTime: '04:00 PM',
      checkOutTime: '11:00 AM',
      contactPhone: '+1 (305) 555-0123',
      contactEmail: 'contact@luxurybeach.com',
      welcomeGreeting: 'Welcome {{first-name}} {{last-name}}!',
      welcomeMessage: "We're delighted to have you. Make yourselves at home and enjoy the serene views. Whether you're here to relax, explore, or unwind, we hope you have a wonderful stay.",
      weatherCity: 'Miami',
      weatherUnit: 'F',
      websiteUrl: 'https://luxurybeach.com',
      showCheckInOut: true,
      standardCheckInTime: '16:00',
      standardCheckOutTime: '11:00',
      showHoursOfOperation: false,
      hoursOfOperationFrom: '',
      hoursOfOperationTo: '',
      showWifi: true,
      showContact: true,
      showWeather: true,
      showQRCodes: true,
      showLogo: true,
      showWelcomeMessage: true,
      tvDevices: [
        { name: 'Living Room', otp: '914792' },
        { name: 'Master Bedroom', otp: '827461' }
      ],
      qrCodes: [
        { type: 'Guidebook', name: 'House Guide', details: 'https://guide.luxurybeach.com' },
        { type: 'WiFi', name: 'WiFi QR', details: 'WIFI:T:WPA;S:Beach House WiFi;P:welcome123;;' }
      ],
      toursLink: 'https://vi.me/GSCJL',
      guestList: [
        { id: '1', firstName: 'John', lastName: 'Smith', checkIn: '2024-11-05', checkOut: '2024-11-08', language: 'English' },
        { id: '2', firstName: 'Maria', lastName: 'Garcia', checkIn: '2024-11-10', checkOut: '2024-11-15', language: 'Spanish' }
      ]
    },
    {
      id: '2',
      name: 'Downtown Loft',
      address: '456 Main St, New York, NY',
      image: 'https://images.unsplash.com/photo-1502672260066-6bc35f0af07e?w=400',
      active: true,
      bedrooms: 2,
      bathrooms: 2,
      guests: 4,
      price: 320,
      rating: 4.6,
      reviews: 87,
      tvs: 1,
      amenities: ['WiFi', 'Gym', 'Parking', 'Kitchen'],
      description: 'Modern loft in the heart of downtown',
      carouselImages: [
        'https://images.unsplash.com/photo-1502672260066-6bc35f0af07e?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
      ],
      tvLayout: 'layout2',
      backgroundImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=3840',
      backgroundVideo: '',
      backgroundMusic: '',
      logo: '',
      language: 'English',
      wifiNetwork: 'Loft WiFi',
      wifiPassword: 'loft2024',
      checkInTime: '03:00 PM',
      checkOutTime: '11:00 AM',
      contactPhone: '+1 (212) 555-0456',
      contactEmail: 'info@downtownloft.com',
      welcomeGreeting: 'Welcome to Downtown Loft!',
      welcomeMessage: 'Enjoy your stay in the heart of the city.',
      weatherCity: 'New York',
      weatherUnit: 'F',
      websiteUrl: 'https://downtownloft.com',
      showCheckInOut: true,
      standardCheckInTime: '15:00',
      standardCheckOutTime: '11:00',
      showHoursOfOperation: false,
      hoursOfOperationFrom: '',
      hoursOfOperationTo: '',
      showWifi: true,
      showContact: true,
      showWeather: true,
      showQRCodes: true,
      showLogo: true,
      showWelcomeMessage: true,
      tvDevices: [
        { name: 'Living Area', otp: '456789' }
      ],
      qrCodes: [],
      toursLink: '',
      guestList: [
        { id: '3', firstName: 'Sarah', lastName: 'Johnson', checkIn: '2024-11-12', checkOut: '2024-11-16', language: 'English' }
      ]
    },
    {
      id: '3',
      name: 'Mountain Cabin',
      address: '789 Pine Trail, Aspen, CO',
      image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=400',
      active: true,
      bedrooms: 3,
      bathrooms: 2,
      guests: 6,
      price: 380,
      rating: 4.9,
      reviews: 156,
      tvs: 2,
      amenities: ['WiFi', 'Fireplace', 'Hot Tub', 'Ski Storage', 'Kitchen'],
      description: 'Cozy mountain retreat with stunning views',
      carouselImages: [
        'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800',
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
        'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800'
      ],
      tvLayout: 'layout3',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=3840',
      backgroundVideo: '',
      backgroundMusic: '',
      logo: '',
      language: 'English',
      wifiNetwork: '',
      wifiPassword: '',
      checkInTime: '04:00 PM',
      checkOutTime: '10:00 AM',
      contactPhone: '',
      contactEmail: 'stay@mountaincabin.com',
      welcomeGreeting: 'Welcome to Mountain Cabin!',
      welcomeMessage: 'Relax and unwind in our cozy mountain retreat.',
      weatherCity: '',
      weatherUnit: 'F',
      websiteUrl: 'https://mountaincabin.com',
      showCheckInOut: false,
      standardCheckInTime: '16:00',
      standardCheckOutTime: '10:00',
      showHoursOfOperation: false,
      hoursOfOperationFrom: '',
      hoursOfOperationTo: '',
      showWifi: false,
      showContact: true,
      showWeather: false,
      showQRCodes: true,
      showLogo: true,
      showWelcomeMessage: true,
      tvDevices: [
        { name: 'Living Room', otp: '123456' },
        { name: 'Bedroom', otp: '789012' }
      ],
      qrCodes: [
        { type: 'Menu', name: 'Restaurant Menu', details: 'https://menu.mountaincabin.com' }
      ],
      toursLink: '',
      guestList: []
    }
  ],
  tasks: [
    { id: '1', title: 'Deep clean Luxury Beach House', listing: 'Luxury Beach House', dueDate: '2024-10-24', priority: 'high', status: 'pending' },
    { id: '2', title: 'Restock amenities Downtown Loft', listing: 'Downtown Loft', dueDate: '2024-10-25', priority: 'medium', status: 'in-progress' },
  ],
  users: [
    { id: '1', name: 'Admin User', email: 'admin@bizscreen.app', role: 'Admin', lastActive: '2 hours ago', status: 'active' },
    { id: '2', name: 'Editor User', email: 'editor@bizscreen.app', role: 'Editor', lastActive: '1 day ago', status: 'active' }
  ],
  faqs: [
    { id: '1', category: 'General', question: 'How do I get started with BizScreen?', answer: 'Complete the setup wizard and add your first location.' },
    { id: '2', category: 'Billing', question: 'How does billing work?', answer: 'You are billed monthly based on your plan. All major credit cards are accepted.' },
    { id: '3', category: 'Features', question: 'How many TV layouts are available?', answer: 'We offer 4 professionally designed layouts that you can customize for your business.' }
  ],
  viatorStats: {
    totalEarnings: 1245.50,
    thisMonth: 342.80,
    bookings: 28,
    experiences: [
      { id: '1', name: 'Miami City Tour', price: 89.99, commission: 12.99, rating: 4.8, image: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=300' },
      { id: '2', name: 'Everglades Adventure', price: 129.99, commission: 18.99, rating: 4.9, image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300' }
    ]
  }
};
