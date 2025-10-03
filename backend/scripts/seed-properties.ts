import { database } from '../src/shared/database';
import { Property, PropertyImage, Agency, User } from '../src/shared/database/models';
import { createGeoJSONPoint } from '../src/shared/types/geojson.types';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { Sequelize } from 'sequelize-typescript';
import { insertAgency } from './seed-agencies';
import { imageService } from '../src/shared/services/ImageService';
import https from 'https';
import http from 'http';
import config from '../src/shared/config';

function getCapFromCity(cityFormatted: string) {
    // CAP generico storico
    switch (cityFormatted.toLowerCase()) {
        case 'napoli': return '80100';
        case 'padova': return '35100';
        case 'venezia': return '30100';
        case 'verona': return '37100'; 
        case 'perugia': return '06100';
        case 'firenze': return '50100';
        case 'livorno': return '57100';
        case 'palermo': return '90100';
        case 'catania': return '95100';
        case 'cagliari': return '09100';
        case 'bari': return '70100';   
        case 'foggia': return '71100'; 
        case 'torino': return '10100'; 
        case 'pesaro': return '61100'; 
        case 'ancona': return '60100'; 
        case 'milano': return '20100'; 
        case 'genova': return '16100'; 
        case 'roma': return '00100';   
        case 'trieste': return '34100';
        case 'modena': return '41100'; 
        case 'bologna': return '40100';
        case 'forl': return '47100';  
        case 'rimini': return '47900'; 
        case 'ravenna': return '48100';
        case 'salerno': return '84100';
        case 'pescara': return '65100';
        case 'reggioemilia': return '42100';
        case 'reggiocalabria': return '89100';
    }

    const comuniData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'comuni.json'), 'utf-8'));
    for (const comune of comuniData) {
        if (comune.nome.toLowerCase().replace(/[^a-z0-9]/g, '') === cityFormatted) {
            if(comune.cap.length === 1) {
                return comune.cap[0];
            }
        }
    }

}

function getBigPhoto(url: string) {
    const urlObj = new URL(url);
    const ext = path.extname(urlObj.pathname);
    const xxlFilename = 'xxl' + ext;
    urlObj.pathname = path.posix.join(path.dirname(urlObj.pathname), xxlFilename);
    return urlObj.toString();
}

async function downloadImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirects
                if (response.headers.location) {
                    downloadImage(response.headers.location).then(resolve).catch(reject);
                    return;
                }
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
                return;
            }

            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
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

    if(property.properties.length > 1 || property.properties.length === 0) {
        throw new Error("Multiple or no properties found for property " + property.uuid);
    }
  
    const mainProperty = property.properties[0];
    if (!mainProperty) {
        throw new Error("No property data found");
    }
    if(!mainProperty?.location) {
        throw new Error("No location data found");
    }

    const cap = getCapFromCity(mainProperty?.location?.city?.replace(/[^a-z0-9]/gi, '').toLowerCase());

    if(!(property?.advertiser?.agency?.type === 'agency')) {
        throw new Error("No agency found for property " + property.uuid);
    }

    const features = mainProperty?.ga4features || [];
    if(features.length === 0) {
        throw new Error("No features found for property " + property.uuid);
    }

    let agency = await getAgencyByName(property.advertiser.agency.displayName);
    if(!agency) {
        agency = await insertAgency(property.advertiser.agency.id);
    }
    if(!agency) {
        throw new Error("No agency found for property " + property.uuid);
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
        features: features,
        street: String(mainProperty.location?.address),
        city: String(mainProperty.location?.city),
        province: String(mainProperty.location?.province),
        zipCode: String(cap || ''),
        country: 'Italia',
        location: createGeoJSONPoint(
            Number(mainProperty.location?.longitude || 0),
            Number(mainProperty.location?.latitude || 0)
        ),
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
            
            console.log(`Downloading image ${order + 1} from ${url}`);
            const imageBuffer = await downloadImage(url);
            
            console.log(`Uploading image ${order + 1} to S3...`);
            const uploadResult = await imageService.uploadImage(
                imageBuffer,
                `property-${property.uuid}-${order}.jpg`,
                'image/jpeg',
                property.uuid,
                agency.id,
                property.contract === 'rent' ? 'rent' : 'sale'
            );

            await PropertyImage.create({
                propertyId: property.uuid,
                s3KeyOriginal: uploadResult.originalKey,
                s3KeySmall: uploadResult.smallKey,
                s3KeyMedium: uploadResult.mediumKey,
                s3KeyLarge: uploadResult.largeKey,
                bucketName: config.s3.bucketName,
                fileName: uploadResult.fileName,
                contentType: uploadResult.contentType,
                fileSize: uploadResult.fileSize,
                width: uploadResult.width,
                height: uploadResult.height,
                uploadDate: new Date(),
                caption: photo.caption || '',
                alt: photo.caption || '',
                isPrimary: order === 0,
                order: order
            });

            console.log(`Successfully uploaded image ${order + 1} to S3`);
            order++;
        } catch (error) {
            console.error(`Error processing photo ${order}:`, error);
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
        if (file.isFile() && file.name.endsWith('.json')) {
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