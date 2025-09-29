import { database } from '../src/shared/database';
import { Property, PropertyImage, Agency, User } from '../src/shared/database/models';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { Sequelize } from 'sequelize-typescript';

function getBigPhoto(url: string) {
    const urlObj = new URL(url);
    const ext = path.extname(urlObj.pathname);
    const xxlFilename = 'xxl' + ext;
    urlObj.pathname = path.posix.join(path.dirname(urlObj.pathname), xxlFilename);
    return urlObj.toString();
}

async function getAgencyByName(name: string) {
    return await Agency.findOne({
        attributes: ['id'],
        where: Sequelize.where(
            Sequelize.fn('upper', Sequelize.fn('trim', Sequelize.col('name'))),
            name.trim().toUpperCase()
        )
    });

}

async function getRandomAgencyByCity(city: string) {
    const agencies = await Agency.findAll({
        attributes: ['id'],
        where: Sequelize.where(
            Sequelize.fn('upper', Sequelize.fn('trim', Sequelize.col('city'))),
            city.trim().toUpperCase()
        )
    });
    if(agencies.length === 0) {
        return null;
    }
    return agencies[Math.floor(Math.random() * agencies.length)];

}

async function getRandomAgency() {
    const agencies = await Agency.findAll({
        attributes: ['id'],
    });
    if(agencies.length === 0) {
        return null;
    }
    return agencies[Math.floor(Math.random() * agencies.length)];

}

async function getAgentByAgencyId(agencyId: string) {
    return await User.findOne({
        attributes: ['id'],
        where: {
            agencyId: agencyId,
            role: 'agent'
        }
    });
}

async function processProperty(property: any) {

    const mainProperty = property.properties[0];
    if (!mainProperty) {
        throw new Error("No property data found");
    }
    if(!mainProperty?.location) {
        throw new Error("No location data found");
    }

    let agency;
    if(property?.advertiser?.agency?.type === 'agency') {
        agency = await getAgencyByName(property.advertiser.agency.displayName);
    }
    else {
        if(mainProperty.location?.city) {
            agency = await getRandomAgencyByCity(mainProperty.location?.city);
        }
        else {
            throw new Error("No city found for property " + property.uuid);
        }
    }
    if(!agency) {
        agency = await getRandomAgency();
    }
    if(!agency) {
        throw new Error("No agency found");
    }
    const agent = await getAgentByAgencyId(agency.id);
    if(!agent) {
        throw new Error("No agent found for agency " + agency.id);
    }

    // Extract price - handle "prezzo su richiesta" case
    let price = 0;
    if (property.price?.visible && property.price?.value) {
        price = property.price.value;
    } else if (mainProperty.price?.visible && mainProperty.price?.value) {
        price = mainProperty.price.value;
    }

    // Map property type
    let propertyType: 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land' = 'apartment';
    const typologyName = mainProperty.typology?.name?.toLowerCase() || '';
    if (typologyName.includes('villa')) propertyType = 'villa';
    else if (typologyName.includes('casa') || typologyName.includes('house')) propertyType = 'house';
    else if (typologyName.includes('loft')) propertyType = 'loft';
    else if (typologyName.includes('ufficio') || typologyName.includes('office')) propertyType = 'office';
    else if (typologyName.includes('commerciale') || typologyName.includes('commercial')) propertyType = 'commercial';
    else if (typologyName.includes('terreno') || typologyName.includes('land')) propertyType = 'land';

    // Extract surface (remove "m²" and convert to number)
    const surfaceStr = mainProperty.surface || '0';
    const surface = parseInt(surfaceStr.replace(/[^0-9]/g, '')) || 0;


    let bathrooms = mainProperty.bathrooms?.replace(/\D/g, '');
    if(!bathrooms) {
        let b =  mainProperty.featuresList?.filter((f: any) => f.type.toLowerCase().includes('bathroom') || f.label.toLowerCase().includes('bagn'));
        if(b?.length > 0) {
            bathrooms = b?.compactLabel.replace(/\D/g, '') || b?.label.replace(/\D/g, '');
        }
    }

    let floor = mainProperty.floor?.ga4FloorValue || mainProperty.floor?.floorOnlyValue || mainProperty.floor?.value || mainProperty.floor?.abbreviation;
    if(!floor) {
        let f = mainProperty.featuresList?.filter((f: any) => f.type.toLowerCase().includes('floor') || f.label.toLowerCase().includes('piano'))
        if(f?.length > 0) {
            floor = f[0]?.compactLabel || f[0]?.label;
        }
    }

    const propertyData = {
        id: String(property.uuid),
        title: String(property.title),
        description: String(mainProperty.caption || property.title),
        price: price,
        propertyType: propertyType,
        listingType: property.contract === 'rent' ? 'rent' : 'sale',
        status: 'active',
        bedrooms: Number(mainProperty.bedRoomsNumber?.replace(/\D/g, '') || 1),
        bathrooms: Number(bathrooms || 1),
        area: surface,
        floor: String(floor || ''),
        energyClass:  ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'][Math.floor(Math.random() * 8)],
        hasElevator: Boolean(mainProperty.elevator || false),
        hasBalcony: Boolean(mainProperty.ga4features?.some((f: any) => f.toLowerCase().includes('balcone')) || false),
        hasGarden: Boolean(mainProperty.multimedia?.photos?.some((p: any) => p.caption?.toLowerCase().includes('giardino')) || false),
        hasParking: Boolean(mainProperty.ga4garage || false),
        features: mainProperty.ga4features || [],
        street: String(mainProperty.location?.address),
        city: String(mainProperty.location?.city),
        province: String(mainProperty.location?.province),
        zipCode: '00000', //TODO
        country: 'Italia',
        latitude: Number(mainProperty.location?.latitude || 0),
        longitude: Number(mainProperty.location?.longitude || 0),
        agentId: agent.id,
        isActive: true,
        views: 0,
        favorites: 0,
    };
    console.log(propertyData);
    await Property.findOrCreate({
        attributes: ['id'],
        where: { id: propertyData.id },
        defaults: propertyData
    });

    let order = 0;
    for (const photo of (property?.photo || []).concat(mainProperty.multimedia?.photos || [])) {
        try {
            const url = getBigPhoto(photo.urls?.large || photo.urls?.medium || photo.urls?.small);

            await PropertyImage.findOrCreate({
                attributes: ['id'],
                where: { url: url },
                defaults: {
                    propertyId: property.uuid,
                    url: url,
                    alt: photo.caption || '',
                    isPrimary: order === 0,
                    order: order,
                    filename: null,
                    mimeType: null,
                    fileSize: null,
                    width: null,
                    height: null
                }
            });

            order++;
        } catch (error) {
            console.error('Error processing photo:', error);
        }
    }
}

async function seedDB() {
 
    await database.connect();

    const dir = path.join(__dirname, '..', 'data');
    const files = await fs.promises.readdir(dir, { 
        withFileTypes: true, 
        recursive: true 
    });
    
    
    for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json') && file.parentPath.includes('vendita')) {
            console.log(`Processing file: ${file.name}`);
            const rawData = await fs.promises.readFile(path.join(file.parentPath, file.name), 'utf-8');
            const data = JSON.parse(rawData);
            
            if (data.results && Array.isArray(data.results)) {
                for (const item of data.results) {
                    try {
                        await processProperty(item.realEstate);
                    } catch (err) {
                        console.error('Error processing property:', err);
                    }
                }
            }
        }
    }
   
}


if (require.main === module) {
  seedDB().catch((error) => {
    console.error('Errore fatale:', error);
    process.exit(1);
  });
}