import Profile from '../models/User.js';

export const updateProfile = async (req, res) => {
  try {
    const { email, ...updateFields } = req.body; // Extract email separately

    // Find the user by ID
    const user = await Profile.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Check if the email is being updated and if it's already in use
    if (email && email !== user.email) {
      const existingUser = await Profile.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateFields.email = email; // Add email only if it's unique
    }

    // Update all fields except `_id`
    const updatedProfile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields }, // Ensures only specified fields are updated
      { new: true, runValidators: true } // Return updated document with validation
    );

    res.status(200).json({message: 'Updated profile'});
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const deletedProfile = await Profile.findByIdAndDelete(req.params.id);
    if (!deletedProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


