from django.core.files.storage import FileSystemStorage


class OverwriteImageStorage(FileSystemStorage):
    """ Storage that delete a previous file with the same name
    and its copy at different resolution
    """

    def get_available_name(self, name, max_length=None):
        # If the filename already exists,
        # remove it and its copy at different resolution as if it was a true
        # file system
        for path in (name, name+'_l', name+'_s'):
            if self.exists(path):
                self.delete(path)
        return super(OverwriteImageStorage,
                     self).get_available_name(name,
                                              max_length)