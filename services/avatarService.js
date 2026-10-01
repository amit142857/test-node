const { supabase } = require("../config/supabase");
const profileRepository = require("../repositories/profileRepository");

/**
 * Upload an avatar to Supabase Storage and update the user's profile.
 * Returns the public URL of the uploaded avatar.
 */
const uploadAvatar = async (userId, file) => {
    if (!file) {
        const error = new Error("No file uploaded. Please provide an image.");
        error.status = 400;
        throw error;
    }

    const extension = file.mimetype.split("/")[1]; // jpeg, png, webp
    const filePath = `${userId}/avatar.${extension}`;

    // Upload to Supabase Storage (upsert replaces any existing avatar)
    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file.buffer, {
            upsert: true,
            contentType: file.mimetype,
        });

    if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        const error = new Error("Failed to upload avatar to storage");
        error.status = 500;
        throw error;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update the profiles table
    await profileRepository.updateAvatarUrl(userId, publicUrl);

    return publicUrl;
};

module.exports = { uploadAvatar };
