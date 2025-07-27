# Simple evaluation script to compare AI predictions with ground truth
import os
import json
import argparse

def calculate_overlap(box1, box2):
    """Calculate how much two boxes overlap"""
    # Get box coordinates
    x1_start, y1_start, x1_end, y1_end = box1['x1'], box1['y1'], box1['x2'], box1['y2']
    x2_start, y2_start, x2_end, y2_end = box2['x1'], box2['y1'], box2['x2'], box2['y2']
    
    # Find where boxes overlap
    overlap_left = max(x1_start, x2_start)
    overlap_top = max(y1_start, y2_start)
    overlap_right = min(x1_end, x2_end)
    overlap_bottom = min(y1_end, y2_end)
    
    # Check if boxes actually overlap
    if overlap_right <= overlap_left or overlap_bottom <= overlap_top:
        return 0.0
    
    # Calculate overlap area
    overlap_area = (overlap_right - overlap_left) * (overlap_bottom - overlap_top)
    
    # Calculate total area of both boxes
    area1 = (x1_end - x1_start) * (y1_end - y1_start)
    area2 = (x2_end - x2_start) * (y2_end - y2_start)
    total_area = area1 + area2 - overlap_area
    
    # Return overlap percentage
    if total_area > 0:
        return overlap_area / total_area
    else:
        return 0.0

def count_correct_predictions(ground_truth_boxes, predicted_boxes, element_type):
    """Count how many AI predictions are correct for one element type"""
    # Find all boxes of this element type
    gt_boxes = []
    pred_boxes = []
    
    for box in ground_truth_boxes:
        if box['tag'].lower() == element_type.lower():
            gt_boxes.append(box)
    
    for box in predicted_boxes:
        if box['tag'].lower() == element_type.lower():
            pred_boxes.append(box)
    
    # Count matches (overlap >= 50%)
    correct_count = 0
    used_gt_boxes = []
    
    for pred_box in pred_boxes:
        for i, gt_box in enumerate(gt_boxes):
            # Skip if this ground truth box was already matched
            if i in used_gt_boxes:
                continue
            
            # Check if boxes overlap enough (50% or more)
            overlap = calculate_overlap(gt_box, pred_box)
            if overlap >= 0.5:
                correct_count = correct_count + 1
                used_gt_boxes.append(i)
                break  # Move to next prediction
    
    return len(gt_boxes), len(pred_boxes), correct_count

def main():
    # Get command line arguments
    parser = argparse.ArgumentParser(description='Compare AI predictions with ground truth')
    parser.add_argument('--gt', required=True, help='Folder with ground truth JSON files')
    parser.add_argument('--pred', required=True, help='Folder with prediction JSON files')
    args = parser.parse_args()
    
    # Element types we want to check
    element_types = ['button', 'input', 'radio', 'dropdown']
    
    # Keep track of totals
    results = {}
    for element_type in element_types:
        results[element_type] = {
            'ground_truth_total': 0, 
            'predicted_total': 0, 
            'correct_total': 0
        }
    
    # Get list of ground truth files
    gt_files = os.listdir(args.gt)
    json_files = []
    for filename in gt_files:
        if filename.endswith('.json'):
            json_files.append(filename)
    
    print(f"Found {len(json_files)} files to evaluate")
    print("Processing files...")
    
    # Process each file
    for filename in json_files:
        gt_file_path = os.path.join(args.gt, filename)
        pred_file_path = os.path.join(args.pred, filename)
        
        # Skip if prediction file doesn't exist
        if not os.path.exists(pred_file_path):
            print(f"Warning: No prediction file for {filename}")
            continue
        
        # Read the JSON files
        with open(gt_file_path, 'r') as f:
            ground_truth_data = json.load(f)
        with open(pred_file_path, 'r') as f:
            prediction_data = json.load(f)
        
        # Count matches for each element type
        for element_type in element_types:
            gt_count, pred_count, correct_count = count_correct_predictions(
                ground_truth_data, prediction_data, element_type
            )
            results[element_type]['ground_truth_total'] += gt_count
            results[element_type]['predicted_total'] += pred_count
            results[element_type]['correct_total'] += correct_count
    
    # Print results
    print("\nEvaluation Results:")
    print("=" * 50)
    
    for element_type in element_types:
        gt_total = results[element_type]['ground_truth_total']
        pred_total = results[element_type]['predicted_total']
        correct_total = results[element_type]['correct_total']
        
        # Calculate scores
        if pred_total > 0:
            precision = correct_total / pred_total
        else:
            precision = 0
            
        if gt_total > 0:
            recall = correct_total / gt_total
        else:
            recall = 0
            
        if (precision + recall) > 0:
            f1_score = 2 * precision * recall / (precision + recall)
        else:
            f1_score = 0
        
        print(f"{element_type.upper()}:")
        print(f"  Ground Truth: {gt_total}")
        print(f"  Predicted: {pred_total}")
        print(f"  Correct: {correct_total}")
        print(f"  Precision: {precision:.2f}")
        print(f"  Recall: {recall:.2f}")
        print(f"  F1-score: {f1_score:.2f}")
        print()

if __name__ == '__main__':
    main()
