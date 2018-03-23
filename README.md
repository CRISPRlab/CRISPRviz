<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/logo.png" width="700">

CRISPRviz (CRISPR Visualizer) identifies and extracts repeats and spacers from genome files (.fasta), then displays this information via local web server for additional manipulation (localhost:4444).

For more information, please see paper:
(in progress)  

## Program operation

CRISPRviz is based on bash and python scripts and run from the command line. A Docker instance is also available.

`crisprviz.sh -h`
```
Usage: crisprviz.sh [OPTIONS]

Options:
    -t  Test installation >> Runs pipeline on included test data. Results are displayed at localhost:4444.
    -p 	Parallel processing >> Concurrently processes all genome.fasta files in current directory | (recommended for < 50 - 150 files).
    -s 	Run crisprviz_engine only. Use when spacers|repeats have already been extracted.
    -x 	Split loci. Each locus is listed as a separate row in web results.
    -f 	Filename - must be in ".fasta" format.
    -c 	Clean previous temp files. Removes all *.crisprs, *_spacers.fa, *_repeats.fa prior to execution.
    -r 	Min # of repeats | Default = 4.
    -b 	Min length of CRIPSR repeats in array | Default = 23.
    -e 	Max length of CRISPR repeats in array | Default = 47.
    -m 	Min length of CRISPR spacers in array | Default = 26.
    -n 	Max length of CRISPR spacers in array | Default = 50.
    -i 	Include organisms with no detecatble CRISPR arrays.
    -h 	Show this help menu.
```

The program *will* run with no options, only with the script command supplied - however this is not recommended. **Note:** If no file option is provided (-f), **all .fasta files in the current directory** will be used as input and processed; ideal for high-throughput analysis.
```
crisprviz.sh
```


### Examples:
Navigate to the directory containing your .fasta genome file(s) `cd genomeFolder`, then:
1. Test the installation:

		crisprviz.sh -t

2. Standard run (recommended). Processes all genome files (.fasta) in current directory in parallel (-p) (concurrently), clean tmp files (-c), and splits loci (-x):

		crisprviz.sh -pxc

3. Run for a single genome file (-f genome.fasta), with a min # of repeats of 3 (-r), cleans tmp files (-c), and splits loci (-x):

		crisprviz.sh -cx -f genome.fasta -r 3

4. Processes all genome files in current directory with min and max spacer length of 28 (-m) and 53 (-n) respectively:

		crisprviz.sh -m 28 -n 53

Open **localhost:4444** in your browser to view the results.

# Installation

The pipeline can be installed on Linux and Mac operating systems directly by cloning or downloading this github repo (recommended). Alternatively, a Docker image can be downloaded at https://hub.docker.com/r/crisprlab/crisprviz/ (works on Windows - see 'Docker Installation for Windows below')

## CLI installation (recommended):

#### Software requirements:
- Bash >= 3.2.57 && awk

- Java >= 1.8
- Python >= 2.7 or 3 && pip (install pip for Python 2 and pip3 for Python 3)
  - Mac - using homebrew:

   `brew install python`

   `sudo easy_install pip`
  - Ubuntu:

   `sudo apt-get install -y python3-pip`

- Biopython

  `pip install biopython`
  or

  `pip3 install biopython`


---
1. Clone repo:
```
git clone https://github.com/CRISPRlab/CRISPRviz.git
```

2. Add the bin folder to the PATH variable of your profile of choice (.bash_profile, .profile, .bashrc, etc.):
  ```
  vi ~/.bash_profile
  ```

  ```
  export PATH=$PATH:/path/to/cloned/repo/CRISPRviz/bin
  ```

  ```
  source ~/.bash_profile
  ```

3. Test the command. Make sure the system recognizes crisprviz.sh:
  ```
  which crisprviz.sh
  ```
  should output:
  `/path/to/cloned/repo/CRISPRviz/bin/crisprviz.sh`

4. Test the installation:
  ```
  crisprviz.sh -t
  ```
  Once the processing is complete (typically after a few seconds), go to **localhost:4444** in your browser to view the results:

  <img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/test_results.png" width="700">





## Docker installation:

### Mac | Linux
1. Install Docker: https://www.docker.com/get-docker

2. (Optional) Once Docker is running, create a [Docker Hub account](https://hub.docker.com/) then login from the command line:
  ```
  docker login
  ```

3. Download the latest CRISPRviz image from Docker Hub:
  ```
  docker pull crisprlab/crisprviz
  ```
4. Test the installation:
    ```
    docker run -it -p 4444:8000 \
    crisprlab/crisprviz \
    /bin/bash -c "crisprviz.sh -t; server.py;"
    ```

    Once the processing is complete (typically after a few seconds), you will see: `Minced parsing completed @:  Wed Mar 21 16:01:13 UTC 2018
...Executing server.py...
('Serving HTTP on', '0.0.0.0', 'port', 8000, '...')`

     Go to **localhost:4444** in your browser to view the results. Docker will sometimes take a minute or two to serve the page up, especially if it is the first time the Python server is started, so be patient. Sometimes refreshing the page can speed up the process.

5. Place the genome files you wish to process in a directory (on your Desktop for example: **~/Desktop/genomesFolder**)

6. Create the CRISPRviz container and begin processing genomes! **Note** - Before copy/pasting the below script into the command line, two modifications need to be made:

    *a)* -v **/Users/userName/Desktop/genomesFolder**:/app/userdata   ||   The bolded directory must be updated to the **absolute** path to the directory containing your genome files from Step 5. The /app/userdata directory is the location in the container where your data will be housed when the container spins up, and should not be modified!

    *b)* **crisprviz.sh -pxc;**   ||   This command be modified to reflect any additional options you wish to include in your run.
  ```
  docker run -it -p 4444:8000 \
  -v /Users/userName/Desktop/genomesFolder:/app/userdata \
  crisprlab/crisprviz \
  /bin/bash -c "cd /app/userdata; \
  crisprviz.sh -pxc; \
  server.py --dir .."
  ```
---

### Windows

1. Download Docker Toolbox for Windows: https://docs.docker.com/toolbox/toolbox_install_windows/#what-you-get-and-how-it-works

2. Install with default settings.

3. Click 'Yes' to any additional permissions installation questions.

4. Launch Docker Quickstart Terminal from your Desktop.

5. (Optional) Once Docker is running, create a [Docker Hub account](https://hub.docker.com/) then login from the command line:
  ```
  docker login
  ```

6. Download the latest CRISPRviz image from Docker Hub:
  ```
  docker pull crisprlab/crisprviz
  ```

7. Configure docker-machine. First make sure the virtualbox is running:
```
docker-machine ls
```
Then, set the default ip address for the docker-machine. We will be using this displayed ip to access the local server in the next step:
```
docker-machine ip default
```

8. Test the installation:
```
docker run -it -p 4444:8000 \
crisprlab/crisprviz \
/bin/bash -c "crisprviz.sh -t; server.py;"
```

  Once the processing is complete (typically after a few seconds), you will see: `Minced parsing completed @:  Wed Mar 21 16:01:13 UTC 2018
...Executing server.py...
('Serving HTTP on', '0.0.0.0', 'port', 8000, '...')`

 Go to **(default ip from step 7):4444** in your browser to view the results. Example:  **192.168.99.100:4444**. Docker will sometimes take a minute or two to serve the page up, especially if it is the first time the Python server is started, so be patient. Sometimes refreshing the page can speed up the process.

9. Place the genome files you wish to process in a directory (on your Desktop for example: **~/Desktop/genomesFolder**)

10. Create the CRISPRviz container and begin processing genomes! **Note** - Before copy/pasting the below script into the Docker command line, two modifications need to be made:

    *a)* -v **/Users/userName/Desktop/genomesFolder**:/app/userdata   ||   The bolded directory must be updated to the **absolute** path to the directory containing your genome files from Step 9. The /app/userdata directory is the location in the container where your data will be housed when the container spins up, and should not be modified!

    *b)* **crisprviz.sh -pxc;**   ||   This command be modified to reflect any additional options you wish to include in your run.
```
docker run -it -p 4444:8000 \
-v /Users/userName/Desktop/genomesFolder:/app/userdata \
crisprlab/crisprviz \
/bin/bash -c "cd /app/userdata; \
crisprviz.sh -pxc; \
server.py --dir .."
```

---
### Helpful Tips on Navigating the UI

#### Importing files:
Json files generated or exported from CRISPRviz can be quickly imported to the web tool by going to **File actions > Import**, then dragging and dropping the .json file onto the 'Choose File' button.

#### Updating Row Names:
Row names are generated from the genome files you provide. Often times, these files have long cumbersome names (especially from NCBI) that are a series of numbers, not helpful or descriptive. Rename the genome files before running them through the pipeline, or you can edit the row names directly in the UI. Hit Enter to save.

<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/text_edit_before.png" width="200">

<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/text_edit_after.png" width="200">
#### Sorting Rows and Spacers
Rows, spacers, and repeats are all sortable. Rows can be moved by grabbing the row sort icon <img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/row_sort_icon.png" width="22">, and dragging up or down:

<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/sortable_row.png">

Spacers and repeats can also be sorted independently:

<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/sortable_spacer.png" width="200">

#### Multiple Sequence Alignment
<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/align.png" width="120">

To launch an alignment, click the 'Align spacers' button. This method uses a progressive alignment algorithm that is optimized for closely related organisms. Distantly related organisms can still be aligned, but if no spacers are shared, no gaps are inserted and rows are simply reordered based on their similarity score.

Sortable rows and spacers allow creation or manipulation of sequence alignments to begin understanding the unique evolutionary history of the organisms in question:

<img src="https://github.com/CRISPRlab/CRISPRviz/blob/master/img/gaps.png" width="550">

---

### Troubleshooting
If you have other processes running on port 4444, including a CRISPRviz instance, you may get the error:

 **Error starting userland proxy: Bind for 0.0.0.0:4444 failed: port is already allocated.**

 If that occurs, gracefully shutdown or kill the culprit process. You can see what processes are running on what ports with the command: `lsof -i | grep LISTEN`. For example: if the CRISPRviz Python server is blocking the port, first find the process: `ps -ax | grep python`, then kill it using the PID: `kill -9 PID`.
