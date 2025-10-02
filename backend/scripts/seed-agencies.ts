// https://www.immobiliare.it/api-next/agencies/local-expert/?sort-by=bundle&limit=10000&output=json&__lang=it

import { database } from '../src/shared/database';
import { Agency, User } from '../src/shared/database/models';
import fs from 'fs';
import path from 'path';
import { fakerIT } from '@faker-js/faker';


function ucFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function randomPhoneNumber() {
    return `+39${fakerIT.string.numeric(10)}`;
}

async function createCreatorUser(agencyNameFormatted: string, agencyCityFormatted: string = 'city') {

    const user = await User.create({
        email: `admin@${agencyNameFormatted}${agencyCityFormatted}.it`,
        password: `${ucFirst(agencyNameFormatted)}${ucFirst(agencyCityFormatted)}123!`,
        firstName: fakerIT.person.firstName(),
        lastName: fakerIT.person.lastName(),
        role: 'admin',
        isVerified: true,
        isActive: true,
        phone: randomPhoneNumber(),
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
        agencyId: null,
        shouldChangePassword: true
    });
    return user;
}

async function createAgentUser(agencyNameFormatted: string, agencyCityFormatted: string = 'city') {

    const user = await User.create({
        email: `agent@${agencyNameFormatted}${agencyCityFormatted}.it`,
        password: `${ucFirst(agencyNameFormatted)}${ucFirst(agencyCityFormatted)}123!`,
        firstName: fakerIT.person.firstName(),
        lastName: fakerIT.person.lastName(),
        licenseNumber: `AGENT${fakerIT.string.numeric(6)}`,
        role: 'agent',
        isVerified: true,
        isActive: true,
        phone: randomPhoneNumber(),
        specializations: ['residential', 'commercial', 'land', 'industrial', 'rural', 'luxury'].sort(() => 0.5 - Math.random()).slice(0, 3),
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
        agencyId: null,
        shouldChangePassword: true
    });
    return user;
}

async function seedAgencies() {

    await database.connect();
    
    const agenciesDataPath = path.join(__dirname, '..', 'data', 'agencies.json');
    if (!fs.existsSync(agenciesDataPath)) {
        throw new Error(`File not found: ${agenciesDataPath}`);
    }
    const agenciesDataRaw = fs.readFileSync(agenciesDataPath, 'utf-8');
    const agenciesData = JSON.parse(agenciesDataRaw);

    for (const agencyData of agenciesData.agencies) {

        const capMatch = agencyData.address.match(/\b\d{5}\b/);
        const zipCode = capMatch ? capMatch[0] : null;
        let city = null;
        let province = null; // We don't have province data from the source
        if (zipCode) {
            const cityMatch = agencyData.address.match(new RegExp(`${zipCode} - ([^-]+)$`));
            city = cityMatch ? cityMatch[1].trim() : null;
        }
        const streetAddress = zipCode ? agencyData.address.split(zipCode)[0].trim() : agencyData.address;

        if (!city) {
            console.warn(`Skipping agency "${agencyData.displayName}" due to missing city in address: ${agencyData.address}`);
            continue;
        }

        const agencyNameFormatted = agencyData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const agencyCityFormatted = city.toLowerCase().replace(/[^a-z0-9]/g, '');

        try {
            const creatorUser = await createCreatorUser(agencyNameFormatted, agencyCityFormatted);
            const agentUser = await createAgentUser(agencyNameFormatted, agencyCityFormatted);

            await Agency.create({
                id: agencyData.uuid,
                name: agencyData.displayName,
                description: null,
                street: streetAddress,
                city: city,
                province: province,
                zipCode: zipCode,
                country: 'Italy',
                phone: randomPhoneNumber(),
                email: `info@${agencyNameFormatted}${agencyCityFormatted}.it`,
                logo: agencyData?.imageUrls?.large || null,
                licenseNumber: `AGENCY${fakerIT.string.numeric(6)}`,
                isActive: true,
                website: `https://www.${agencyNameFormatted}${agencyCityFormatted}.it`,
                createdBy: creatorUser.id,
            });

            // Update users with agencyId
            [creatorUser, agentUser].forEach(async (user) => {
                user.agencyId = agencyData.uuid;
                await user.save();
            });
        } catch (error) {
            console.warn(`Error processing agency "${agencyData.displayName}":`, error);
            continue;
        }

    }
    
}


if (require.main === module) {
  seedAgencies().catch((error) => {
    console.error('Errore fatale:', error);
    process.exit(1);
  });
}