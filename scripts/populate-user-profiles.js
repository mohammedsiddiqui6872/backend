const { MongoClient } = require('mongodb');

async function populateUserProfiles() {
  const uri = 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db('gritservices');
    const usersCollection = db.collection('users');

    // Profile templates for different roles
    const profileTemplates = {
      admin: {
        profile: {
          dateOfBirth: new Date('1985-03-15'),
          gender: 'male',
          nationality: 'UAE',
          address: {
            street: '123 Business Bay',
            city: 'Dubai',
            state: 'Dubai',
            country: 'United Arab Emirates',
            postalCode: '12345'
          },
          emergencyContact: {
            name: 'Sarah Johnson',
            relationship: 'Spouse',
            phone: '+971-50-111-2222',
            email: 'sarah.johnson@email.com'
          },
          employeeId: 'EMP001',
          department: 'Management',
          position: 'Restaurant Administrator',
          hireDate: new Date('2020-01-15'),
          employmentType: 'full-time',
          salary: {
            amount: 15000,
            currency: 'AED',
            type: 'monthly'
          },
          bankDetails: {
            accountName: 'Admin User',
            accountNumber: '1234567890',
            bankName: 'Emirates NBD',
            iban: 'AE123456789012345678901'
          },
          documents: [
            {
              type: 'id',
              name: 'Emirates ID',
              url: '/uploads/documents/emirates-id-admin.pdf',
              expiryDate: new Date('2026-12-31'),
              uploadedAt: new Date()
            },
            {
              type: 'passport',
              name: 'Passport',
              url: '/uploads/documents/passport-admin.pdf',
              expiryDate: new Date('2028-06-30'),
              uploadedAt: new Date()
            }
          ],
          notes: 'Experienced restaurant administrator with 10+ years in F&B industry'
        },
        shiftPreferences: {
          preferredShifts: ['morning', 'afternoon'],
          maxHoursPerWeek: 45,
          availableDays: [
            { day: 'monday', available: true, preferredTimes: [{ start: '09:00', end: '18:00' }] },
            { day: 'tuesday', available: true, preferredTimes: [{ start: '09:00', end: '18:00' }] },
            { day: 'wednesday', available: true, preferredTimes: [{ start: '09:00', end: '18:00' }] },
            { day: 'thursday', available: true, preferredTimes: [{ start: '09:00', end: '18:00' }] },
            { day: 'friday', available: true, preferredTimes: [{ start: '09:00', end: '18:00' }] },
            { day: 'saturday', available: true, preferredTimes: [{ start: '10:00', end: '16:00' }] },
            { day: 'sunday', available: false }
          ]
        },
        metrics: {
          totalOrdersServed: 0,
          averageRating: 5.0,
          totalHoursWorked: 4320,
          punctualityScore: 98,
          lastReviewDate: new Date('2025-01-15')
        }
      },
      manager: {
        profile: {
          dateOfBirth: new Date('1988-07-22'),
          gender: 'female',
          nationality: 'India',
          address: {
            street: '456 Al Barsha',
            city: 'Dubai',
            state: 'Dubai',
            country: 'United Arab Emirates',
            postalCode: '23456'
          },
          emergencyContact: {
            name: 'Rajesh Kumar',
            relationship: 'Father',
            phone: '+971-50-222-3333',
            email: 'rajesh.kumar@email.com'
          },
          employeeId: 'EMP002',
          department: 'Management',
          position: 'Floor Manager',
          hireDate: new Date('2021-03-20'),
          employmentType: 'full-time',
          salary: {
            amount: 8000,
            currency: 'AED',
            type: 'monthly'
          },
          bankDetails: {
            accountName: 'Manager User',
            accountNumber: '2345678901',
            bankName: 'Abu Dhabi Commercial Bank',
            iban: 'AE234567890123456789012'
          },
          documents: [
            {
              type: 'visa',
              name: 'Work Visa',
              url: '/uploads/documents/visa-manager.pdf',
              expiryDate: new Date('2026-08-31'),
              uploadedAt: new Date()
            },
            {
              type: 'certificate',
              name: 'Hospitality Management Certificate',
              url: '/uploads/documents/cert-manager.pdf',
              uploadedAt: new Date()
            }
          ],
          notes: 'Strong leadership skills, fluent in English, Hindi, and Arabic'
        },
        shiftPreferences: {
          preferredShifts: ['afternoon', 'evening'],
          maxHoursPerWeek: 48,
          availableDays: [
            { day: 'monday', available: true, preferredTimes: [{ start: '14:00', end: '23:00' }] },
            { day: 'tuesday', available: true, preferredTimes: [{ start: '14:00', end: '23:00' }] },
            { day: 'wednesday', available: true, preferredTimes: [{ start: '14:00', end: '23:00' }] },
            { day: 'thursday', available: true, preferredTimes: [{ start: '14:00', end: '23:00' }] },
            { day: 'friday', available: true, preferredTimes: [{ start: '14:00', end: '23:00' }] },
            { day: 'saturday', available: true, preferredTimes: [{ start: '14:00', end: '23:00' }] },
            { day: 'sunday', available: false }
          ]
        },
        metrics: {
          totalOrdersServed: 0,
          averageRating: 4.8,
          totalHoursWorked: 3840,
          punctualityScore: 95,
          lastReviewDate: new Date('2025-01-10')
        }
      },
      chef: {
        profile: {
          dateOfBirth: new Date('1982-11-08'),
          gender: 'male',
          nationality: 'Philippines',
          address: {
            street: '789 Deira',
            city: 'Dubai',
            state: 'Dubai',
            country: 'United Arab Emirates',
            postalCode: '34567'
          },
          emergencyContact: {
            name: 'Maria Santos',
            relationship: 'Wife',
            phone: '+971-50-333-4444',
            email: 'maria.santos@email.com'
          },
          employeeId: 'EMP003',
          department: 'Kitchen',
          position: 'Head Chef',
          hireDate: new Date('2019-06-10'),
          employmentType: 'full-time',
          salary: {
            amount: 6000,
            currency: 'AED',
            type: 'monthly'
          },
          bankDetails: {
            accountName: 'Chef User',
            accountNumber: '3456789012',
            bankName: 'RAKBank',
            iban: 'AE345678901234567890123'
          },
          documents: [
            {
              type: 'certificate',
              name: 'Culinary Arts Diploma',
              url: '/uploads/documents/diploma-chef.pdf',
              uploadedAt: new Date()
            },
            {
              type: 'certificate',
              name: 'Food Safety Certificate',
              url: '/uploads/documents/food-safety-chef.pdf',
              expiryDate: new Date('2026-03-31'),
              uploadedAt: new Date()
            }
          ],
          notes: 'Specialized in Middle Eastern and International cuisine, 15 years experience'
        },
        shiftPreferences: {
          preferredShifts: ['morning', 'afternoon'],
          maxHoursPerWeek: 50,
          availableDays: [
            { day: 'monday', available: true, preferredTimes: [{ start: '10:00', end: '20:00' }] },
            { day: 'tuesday', available: true, preferredTimes: [{ start: '10:00', end: '20:00' }] },
            { day: 'wednesday', available: true, preferredTimes: [{ start: '10:00', end: '20:00' }] },
            { day: 'thursday', available: true, preferredTimes: [{ start: '10:00', end: '20:00' }] },
            { day: 'friday', available: true, preferredTimes: [{ start: '10:00', end: '20:00' }] },
            { day: 'saturday', available: true, preferredTimes: [{ start: '10:00', end: '20:00' }] },
            { day: 'sunday', available: false }
          ]
        },
        metrics: {
          totalOrdersServed: 8500,
          averageRating: 4.9,
          totalHoursWorked: 5200,
          punctualityScore: 92,
          lastReviewDate: new Date('2025-01-05')
        }
      },
      waiter: {
        profile: {
          dateOfBirth: new Date('1995-04-18'),
          gender: 'male',
          nationality: 'Pakistan',
          address: {
            street: '321 Bur Dubai',
            city: 'Dubai',
            state: 'Dubai',
            country: 'United Arab Emirates',
            postalCode: '45678'
          },
          emergencyContact: {
            name: 'Ahmed Khan',
            relationship: 'Brother',
            phone: '+971-50-444-5555',
            email: 'ahmed.khan@email.com'
          },
          employeeId: 'EMP004',
          department: 'Service',
          position: 'Senior Waiter',
          hireDate: new Date('2022-02-01'),
          employmentType: 'full-time',
          salary: {
            amount: 3000,
            currency: 'AED',
            type: 'monthly'
          },
          bankDetails: {
            accountName: 'Waiter User',
            accountNumber: '4567890123',
            bankName: 'Dubai Islamic Bank',
            iban: 'AE456789012345678901234'
          },
          documents: [
            {
              type: 'certificate',
              name: 'Customer Service Training',
              url: '/uploads/documents/training-waiter.pdf',
              uploadedAt: new Date()
            }
          ],
          notes: 'Excellent customer service skills, fluent in English, Urdu, and Hindi'
        },
        shiftPreferences: {
          preferredShifts: ['evening', 'night'],
          maxHoursPerWeek: 48,
          availableDays: [
            { day: 'monday', available: true, preferredTimes: [{ start: '16:00', end: '00:00' }] },
            { day: 'tuesday', available: true, preferredTimes: [{ start: '16:00', end: '00:00' }] },
            { day: 'wednesday', available: true, preferredTimes: [{ start: '16:00', end: '00:00' }] },
            { day: 'thursday', available: true, preferredTimes: [{ start: '16:00', end: '00:00' }] },
            { day: 'friday', available: true, preferredTimes: [{ start: '16:00', end: '00:00' }] },
            { day: 'saturday', available: true, preferredTimes: [{ start: '16:00', end: '00:00' }] },
            { day: 'sunday', available: false }
          ]
        },
        metrics: {
          totalOrdersServed: 2400,
          averageRating: 4.7,
          totalHoursWorked: 2880,
          punctualityScore: 88,
          lastReviewDate: new Date('2024-12-20')
        }
      }
    };

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to update\n`);

    let updatedCount = 0;
    for (const user of users) {
      // Skip if already has profile data
      if (user.profile && user.profile.employeeId) {
        console.log(`Skipping ${user.email || user.name} - already has profile data`);
        continue;
      }
      
      // Skip if no email
      if (!user.email) {
        console.log(`Skipping user ${user.name || 'Unknown'} - no email address`);
        continue;
      }

      // Get the template based on role
      let template = profileTemplates[user.role] || profileTemplates.waiter;
      
      // Customize based on restaurant
      let restaurantName = 'default';
      let empIdPrefix = 'EMP';
      
      if (user.email && user.email.includes('@')) {
        restaurantName = user.email.split('@')[1].split('.')[0];
        empIdPrefix = restaurantName.substring(0, 3).toUpperCase();
      }
      
      // Customize employee ID
      const empNumber = String(updatedCount + 1).padStart(3, '0');
      template.profile.employeeId = `${empIdPrefix}${empNumber}`;
      
      // Vary some data to make it realistic
      if (user.role === 'waiter' && user.email.includes('waiter2')) {
        template.profile.gender = 'female';
        template.profile.nationality = 'Nepal';
        template.profile.emergencyContact.name = 'Sita Sharma';
        template.profile.emergencyContact.relationship = 'Sister';
        template.shiftPreferences.preferredShifts = ['morning', 'afternoon'];
      }

      // Update the user
      const updateResult = await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: {
            profile: template.profile,
            shiftPreferences: template.shiftPreferences,
            metrics: template.metrics,
            updatedAt: new Date()
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        console.log(`✓ Updated profile for ${user.name} (${user.email})`);
        updatedCount++;
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} user profiles!`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

populateUserProfiles();