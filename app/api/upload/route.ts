
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName, publicUrlPrefix } from '@/lib/s3';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF, DOCX, PNG, and JPG are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size too large. Max 20MB.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
        const fileName = `${randomUUID()}-${originalName}`;

        // Upload to S3 (Supabase)
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
        });

        await s3Client.send(command);

        // Construct public URL
        // If publicUrlPrefix is set (from env), use it. Otherwise try to construct it.
        // Usually: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<filename>
        const publicUrl = publicUrlPrefix 
            ? `${publicUrlPrefix}/${fileName}`
            : `https://your-project.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`; // Fallback, though env var should be present

        return NextResponse.json({
            success: true,
            url: publicUrl,
            fileName: originalName
        });

    } catch (error) {
        console.error('Upload error:', error);
        // Surfacing the underlying message (not just a generic 500) is a
        // deliberate, temporary diagnostic aid while tracking down a
        // production-only upload failure. AWS SDK error text here is
        // operational detail (e.g. bad credentials/endpoint), not a secret.
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
